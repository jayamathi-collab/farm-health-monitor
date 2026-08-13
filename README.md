# Farm Health Monitor

Absolutely. Since NDVI must actually work in the prototype, the prompt should explicitly tell Lovable not to create fake NDVI values or a simulated chart. It should build the data flow around real satellite imagery and the farmer's GPS farm boundary.

Build a complete, responsive full-stack web application called AgroHealthy AI for farmers in Tamil Nadu, India.

The application should help farmers monitor their registered farmland using GPS location, real-time weather, satellite-based NDVI, AI crop disease detection, and alerts.

IMPORTANT DEVELOPMENT RULE

This must be a functional prototype, not a static UI mockup.

Do NOT use fake/random NDVI values, fake weather data, or hardcoded satellite readings.

Where an external service requires credentials, create the complete integration structure and clearly expose the required environment variables. The application must gracefully show "Satellite data unavailable" rather than inventing data.

---

1. FARMER REGISTRATION

Create farmer authentication.

Fields:

- Name

- Mobile number

- Preferred language

- District

- Crop

- Crop variety

- Sowing date

- Farm name

After registration, allow the farmer to register a farm.

GPS FARM LOCATION

Use the browser/device Geolocation API to obtain the farmer's current latitude and longitude.

Provide:

"Use My Current Location"

The farmer must be able to:

1. Allow GPS permission.

2. View their current position on a map.

3. Confirm the location.

4. Draw/select the actual farm boundary using a polygon.

5. Save the farm boundary.

Store:

- latitude

- longitude

- polygon coordinates

- farm area

- crop

- sowing date

- farmer ID

The exact farm boundary should only be visible to the authenticated farmer.

---

2. AGRICULTURAL MAP

Create a Google-Maps-like agricultural map.

Use a suitable map provider such as Leaflet + OpenStreetMap if possible to minimize cost.

Map features:

- Current location

- Registered farm boundary

- Farm area

- Crop information

- Satellite/terrain map option if available

- NDVI overlay

- Disease-risk overlay

- Nearby generalized agricultural risk zones

Do NOT expose another farmer's identity or exact private farm boundary.

---

3. REAL NDVI MONITORING — CRITICAL

NDVI is one of the most important features of AgroHealthy AI.

The application must obtain real satellite imagery/data, preferably from a freely accessible source such as Sentinel-2/Copernicus data, or another legitimate satellite-data provider suitable for the project.

Do NOT generate random NDVI values.

For the registered farm polygon:

1. Retrieve the most recent usable satellite observation.

2. Obtain the required red and near-infrared bands.

3. Calculate:

NDVI = (NIR - RED) / (NIR + RED)

4. Mask clouds/cloud-contaminated pixels where appropriate.

5. Calculate statistics for the farm:

   - Mean NDVI

   - Minimum NDVI

   - Maximum NDVI

   - Percentage of healthy vegetation area

   - Percentage of stressed vegetation area

6. Display the result on the farm map as an NDVI heatmap.

Use an understandable scale:

- Very low vegetation

- Low

- Moderate

- Healthy

- Very healthy

Do not claim that a low NDVI automatically means disease. Explain that low vegetation index may indicate crop stress caused by disease, water stress, nutrient problems, harvesting, bare soil, cloud contamination, or other factors.

NDVI HISTORY

Store available NDVI observations by date.

Display:

NDVI Trend

Example:

Date → NDVI

Allow the farmer to see whether vegetation health is:

- Improving

- Stable

- Declining

NDVI UPDATE

Provide:

"Refresh Satellite Data"

The backend should request the latest available usable satellite observation.

If the latest image is unavailable because of cloud cover or satellite revisit timing, clearly explain:

"Latest usable satellite image is unavailable. Showing the most recent usable observation."

Never substitute fake data.

---

4. FARM HEALTH SCORE

Create an overall farm-health dashboard.

Combine available information from:

- NDVI trend

- Weather

- Crop

- Growth stage

- Farmer-reported symptoms

- AI disease detection

Display:

Farm Health: Good / Watch / At Risk

Do not create an arbitrary score without explaining the contributing factors.

Example:

"Farm health is currently Watch because NDVI has declined over the last observation period and humidity has remained high."

---

5. REAL WEATHER DATA

Use a weather API with a free tier where possible.

Use the farm's GPS coordinates.

Retrieve:

- Current temperature

- Humidity

- Rainfall

- Wind speed

- Weather condition

- Forecast

- Rain probability

Display:

Farm Weather

Also show agricultural-relevant information:

- High humidity warning

- Heavy rainfall warning

- Heat stress warning

- Dry-period warning

Never hardcode weather values.

Keep API keys in environment variables.

---

6. AI PLANT DISEASE DETECTION

Create a page called:

AI Crop Doctor

Allow the farmer to:

1. Select crop.

2. Upload/take a photo of a leaf or plant.

3. Send the image to an AI disease-detection backend/model.

4. Display:

   - Possible disease

   - Confidence

   - Symptoms detected

   - Severity estimate

   - Possible alternative causes

   - Recommended next steps

Do not present uncertain AI results as guaranteed diagnoses.

If confidence is low:

"Unable to confidently identify the problem. Please upload a clearer image or consult an agricultural expert."

The system should distinguish, where the model supports it:

- Disease

- Pest damage

- Nutrient deficiency

- Water stress

- Healthy plant

- Unknown

---

7. LOCATION-AWARE CROP HEALTH

The main unique feature is:

Image + Location + Crop + Weather + NDVI + Growth Stage

Use these together to provide contextual crop-health insights.

Example:

Farmer location:

Coimbatore

Crop:

Tomato

Weather:

High humidity + recent rainfall

NDVI:

Declining

Image:

Possible fungal symptoms

Result:

"Your crop shows signs that may be consistent with fungal stress. Local weather conditions are currently favorable for fungal development. Inspect nearby plants and follow verified agricultural guidance."

Do NOT claim that weather or NDVI proves a disease.

---

8. EARLY WARNING SYSTEM

Create an alert engine.

Monitor:

- NDVI decline

- Weather conditions

- Heavy rainfall

- High humidity

- Extreme temperature

- Farmer disease reports

- AI diagnosis results

Generate:

🟢 Normal

No significant risk detected.

🟡 Watch

Potential crop stress detected.

🔴 High Risk

Multiple indicators suggest the farmer should inspect the crop.

Example:

"Crop Health Alert:

NDVI has declined compared with the previous observation and current weather conditions are favorable for crop stress. Inspect your field."

---

9. NEARBY FARM RISK MAP

Create a privacy-safe agricultural risk map.

If multiple registered farmers report similar crop problems in an area:

Display a generalized:

"Disease Risk Zone"

Do NOT reveal:

- Farmer name

- Phone number

- Exact private farm boundary

Only show an approximate/generalized risk area.

Example:

"Tomato disease reports increasing in this area."

This should only activate when sufficient data exists. Do not fabricate reports.

---

10. TAMIL + ENGLISH

The app must support:

English

and

Tamil (தமிழ்)

Create a language switcher.

Important farmer information should be available in Tamil:

- Disease information

- Weather warnings

- NDVI explanation

- Alerts

- Crop-health recommendations

- Navigation

- Voice-assistant responses

Use simple farmer-friendly Tamil instead of highly technical language.

---

11. VOICE ASSISTANT

Create a voice interaction interface.

Allow farmers to ask questions such as:

"என் பயிருக்கு என்ன பிரச்சனை?"

"இன்று மழை வருமா?"

"என் வயலின் நிலை எப்படி இருக்கிறது?"

"NDVI என்றால் என்ன?"

Provide Tamil and English responses.

If browser speech recognition is unavailable, provide a text-input fallback.

Do not claim the assistant is offline unless offline speech functionality has actually been implemented.

---

12. BUTTON PHONE / SMS ACCESS — IMPORTANT

The platform must not depend entirely on smartphones.

Create an SMS alert architecture for farmers using feature phones.

Farmers can register:

- Mobile number

- Farm

- Crop

- Preferred language

Send concise alerts such as:

"AgroHealthy Alert:

Your farm has a crop-health risk. Please inspect your field.

NDVI: Declining.

Weather: High humidity.

Open AgroHealthy app for details."

Tamil SMS should also be supported.

For the prototype, implement the backend SMS integration using a provider with environment variables.

If an SMS provider cannot be used in the free prototype, create a clearly marked SMS Sandbox/Test Mode, but do not pretend that a real SMS was sent.

---

13. FARM HEALTH HISTORY

Create a timeline for each registered farm.

Store:

- NDVI observations

- Disease scans

- Weather observations

- Alerts

- Farmer actions

- Crop stage

Display:

Farm Health History

Example:

August 1 → NDVI 0.62 → Healthy

August 7 → NDVI 0.58 → Watch

August 12 → Disease scan → Possible fungal disease

This should use actual stored observations.

---

14. FARM DASHBOARD

Create a clean dashboard with:

My Farm

📍 Farm location

🌱 Crop

📐 Farm area

🌦️ Current weather

🛰️ Latest NDVI

📈 NDVI trend

❤️ Farm health

🚨 Active alerts

📸 Scan Crop

🗺️ View Farm Map

---

15. NDVI MAP UI

Create a dedicated:

Satellite / NDVI

page.

Show:

- Farm polygon

- NDVI overlay

- NDVI legend

- Latest observation date

- Cloud/data availability status

- NDVI statistics

- NDVI trend graph

Include a simple explanation:

"NDVI measures vegetation greenness using satellite imagery. It can help identify changes in crop vegetation but does not by itself diagnose disease."

---

16. ADMIN / AGRICULTURAL EXPERT DASHBOARD

Create a basic expert dashboard.

Experts can see anonymized/generalized:

- Disease reports

- Crop distribution

- Risk zones

- Alerts

- Farm-health trends

They should not automatically see private farmer information unless authorized.

---

17. DATABASE

Create a proper relational database structure.

Suggested entities:

Users

Farmers

Farms

FarmBoundaries

Crops

CropCycles

NDVIObservations

WeatherObservations

DiseaseScans

Alerts

DiseaseReports

ExpertReports

Use relationships between farmer → farm → crop cycle → observations.

Do not store everything only in frontend/local storage.

---

18. SECURITY

Implement:

- Authentication

- Authorization

- Farmer-specific farm access

- Secure API keys using environment variables

- Input validation

- Protected backend endpoints

A farmer must not be able to access another farmer's private farm data by changing an ID in the URL.

---

19. RESPONSIVE DESIGN

The interface should work on:

- Android phones

- Desktop

- Tablets

Design for farmers first.

Use:

- Large buttons

- Clear icons

- Simple language

- High readability

- Minimal technical terminology

- Easy navigation

Main navigation:

Home | My Farm | NDVI | Crop Doctor | Weather | Alerts

---

20. HOME PAGE

Hero:

AgroHealthy AI

"Your intelligent digital companion for a healthier farm."

Subtitle:

"Monitor your farm using GPS, satellite NDVI, weather intelligence and AI crop-health analysis."

Buttons:

Register My Farm

Scan My Crop

Show feature cards:

🛰️ Satellite NDVI

📍 Smart Farm Mapping

🤖 AI Crop Doctor

🌦️ Weather Intelligence

🚨 Early Warnings

🗣️ Tamil Voice Assistant

📱 SMS Alerts

---

21. COST-CONSCIOUS ARCHITECTURE

Prefer free/open-source technologies and free-tier APIs wherever practical.

Recommended architecture:

Frontend:

React / Vite / Tailwind CSS

Map:

Leaflet + OpenStreetMap

Backend:

Supabase or another suitable free-tier backend

Database:

PostgreSQL

Authentication:

Supabase Auth or equivalent

Weather:

Free-tier weather API

Satellite:

Sentinel-2/Copernicus or another legitimate accessible satellite-data source

NDVI:

Calculate from actual satellite red + NIR bands

AI:

Use an available model/API with environment-variable configuration

SMS:

Use a provider with test/sandbox support during development

IMPORTANT:

Clearly separate:

1. REAL FUNCTIONAL FEATURES

2. FEATURES REQUIRING API CREDENTIALS

3. DEMO/SANDBOX FEATURES

Never represent a simulated result as real agricultural data.

---

22. API / BACKEND STRUCTURE

Create backend services for:

/api/farms

/api/farms/:id/location

/api/farms/:id/ndvi

/api/farms/:id/ndvi/history

/api/farms/:id/weather

/api/disease/analyze

/api/alerts

/api/sms/send

/api/risk-zones

Use proper error handling.

Return meaningful errors when:

- GPS permission is denied

- Farm boundary is invalid

- Satellite image is unavailable

- Cloud coverage is too high

- Weather API fails

- AI service fails

---

23. NDVI FAILURE HANDLING

This is critical.

If satellite data cannot be retrieved:

DO NOT display:

"NDVI = 0.72"

unless it came from actual data.

Instead display:

"NDVI data temporarily unavailable."

Show:

- Last successful observation date

- Reason if available

- Retry button

Possible reasons:

- Cloud coverage

- Satellite image unavailable

- API limit

- Invalid farm boundary

- Authentication/API configuration

---

24. DEMO DATA

You may provide an optional "Demo Farm" for testing the UI.

But clearly label all demo data:

DEMO DATA — NOT REAL SATELLITE OBSERVATION

The real farm workflow must use the farmer's actual GPS location.

---

25. FINAL DEMO FLOW

The complete demonstration should work like this:

Farmer opens AgroHealthy AI

↓

Creates account

↓

Selects Tamil/English

↓

Clicks "Use My Current Location"

↓

GPS detects farm location

↓

Farmer draws farm boundary

↓

Selects crop and sowing date

↓

Farm is registered

↓

Dashboard loads

↓

Real weather data is retrieved using farm coordinates

↓

Latest available real satellite data is retrieved

↓

NDVI is calculated/displayed for the farm

↓

NDVI history begins accumulating

↓

Farmer uploads a crop image

↓

AI Crop Doctor analyzes it

↓

System combines available crop + weather + NDVI context

↓

Farmer receives understandable guidance

↓

If risk becomes significant, an alert is generated

↓

Smartphone users receive app notification

↓

Feature-phone users can receive SMS

---

MOST IMPORTANT REQUIREMENT

Do not build this as merely a beautiful frontend.

The core proof-of-concept must demonstrate these REAL workflows:

GPS → Registered Farm

Farm GPS → Weather

Farm Boundary → Real Satellite Data → NDVI

Crop Image → AI Disease Analysis

Farm Health → Alert

Alert → SMS architecture

If an external API cannot be connected because credentials are unavailable, create the integration correctly and show the configuration requirement instead of fabricating results.

Build the application incrementally and prioritize the working GPS + farm boundary + real NDVI pipeline before adding secondary UI features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/073aad3a-b19c-4ac7-8693-811c8e62c11f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
