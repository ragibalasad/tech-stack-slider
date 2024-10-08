import { NextResponse } from "next/server";
import fetch from "node-fetch"; // Ensure you have node-fetch installed
import fs from "fs";
import path from "path";

// Helper function to convert image URL to Base64
const imageUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    const buffer = await response.buffer();
    return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error converting image to Base64:", error);
    return ""; // Return empty string if there's an error
  }
};

// Define image URL from skillicons.dev
const getImageBase64 = async (techName) => {
  const url = `https://skillicons.dev/icons?i=${techName}`;
  return await imageUrlToBase64(url);
};

// Load colors from JSON file
const loadColors = () => {
  const colorsPath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "techstack",
    "colors.json",
  ); // Adjust path as needed
  const colorsData = fs.readFileSync(colorsPath, "utf-8");
  return JSON.parse(colorsData);
};

export async function GET(request) {
  // Extract the tech query parameter
  const { searchParams } = new URL(request.url);
  const tech = searchParams.get("tech");

  // If tech is not provided, return a 400 error
  if (!tech) {
    return NextResponse.json(
      { error: "Tech parameter is required" },
      { status: 400 },
    );
  }

  // Split the tech string into an array of technologies with percentages
  const techArray = tech.split(",");

  // Load colors
  const colors = loadColors();

  // Define SVG dimensions and circle properties
  const svgWidth = 1200;
  const svgHeight = 100; // Adjusted for horizontal layout
  const circleRadius = 40;
  const circleStrokeWidth = 6;
  const circleDiameter = circleRadius * 2;
  const gap = 20; // Space between circles
  const padding = 12;

  // Create circles for each tech
  const circles = await Promise.all(
    techArray.map(async (t, index) => {
      const cx = circleDiameter * index + circleRadius + gap * index + padding;
      const cy = svgHeight / 2;
      const [techName, percentage] = t.trim().split("-");
      const percentageValue = parseFloat(percentage) || 0;
      const techNameTrimmed = techName.trim().toLowerCase(); // Convert to lower case for consistency
      let logo = "";

      // Fetch Base64 data for the logo
      try {
        logo = await getImageBase64(techNameTrimmed);
      } catch (error) {
        console.error(`Error loading image for ${techNameTrimmed}:`, error);
        logo = "";
      }

      // Log for debugging
      console.log(`Tech: ${techNameTrimmed}, Logo URL: ${logo}`);

      // Get the stroke color for the technology
      const strokeColor = colors[techNameTrimmed] || "#3498db"; // Default color if tech not found

      // Calculate stroke-dashoffset based on percentage
      const radius = circleRadius;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference * (1 - percentageValue / 100);

      return `
      <!-- Background Circle -->
      <circle
        cx="${cx}"
        cy="${cy}"
        r="${circleRadius}"
        stroke="#e6e6e655"
        stroke-width="${circleStrokeWidth}"
        fill="none"
      />
      <!-- Animated Circle -->
      <circle
        cx="${cx}"
        cy="${cy}"
        r="${circleRadius}"
        stroke="${strokeColor}"
        stroke-width="${circleStrokeWidth}"
        fill="none"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        stroke-linecap="round"
        transform="rotate(-90, ${cx}, ${cy})"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="${circumference}"
          to="${offset}"
          dur="1.5s"
          fill="freeze"
          begin="0s"
        />
      </circle>
      <!-- Logo Image -->
      <image
        href="${logo}"
        x="${cx - circleRadius + 16}"
        y="${cy - circleRadius + 16}"
        width="${circleDiameter - 32}"
        height="${circleDiameter - 32}"
        clip-path="url(#clip-${index})"
      />
      <!-- Clip Path for logo -->
      <defs>
        <clipPath id="clip-${index}">
          <circle cx="${cx}" cy="${cy}" r="${circleRadius}" />
        </clipPath>
      </defs>
    `;
    }),
  );

  const svgContent = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      ${circles.join("")}
    </svg>
  `;

  // Return the SVG content with the correct Content-Type
  return new NextResponse(svgContent, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
