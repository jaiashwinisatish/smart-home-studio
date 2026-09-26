# Smart Home Studio

Build a complete Software-Only Smart Home Automation System as a working full-stack web application.

Project Goal

Create a realistic smart-home simulator where users can control virtual home devices such as:

💡 Lights — ON/OFF

🌀 Fans — ON/OFF + speed control

❄️ AC — ON/OFF + temperature

🔌 Smart Plug — ON/OFF

IMPORTANT:
This is a software-only simulation. Do NOT use ESP32, Arduino, relay modules, or physical hardware.

The application should simulate device states in real time through the web application and backend.

Technology Stack

Use:

Frontend

React

TypeScript

Vite

Tailwind CSS

React Router

Lucide React icons

Recharts for analytics

Backend

Node.js

Express.js

TypeScript

REST APIs

Database

Use Supabase/PostgreSQL.

Create proper database tables for:

users

rooms

devices

device_states

automation_rules

command_history

Use environment variables for all API keys and database credentials.

1. Dashboard

Create a modern premium smart-home dashboard.

Show:

Total devices

Devices currently ON

Energy consumption

Active automation rules

Current temperature

Current time

Example:

SMART HOME

Good Morning, Ashwini

┌─────────────────────┐
│ 💡 Lights │
│ 2 / 4 ON │
└─────────────────────┘

┌─────────────────────┐
│ 🌀 Fans │
│ 1 / 2 ON │
└─────────────────────┘

┌─────────────────────┐
│ ⚡ Energy │
│ 4.8 kWh │
└─────────────────────┘

2. Rooms

Create rooms:

Living Room

Bedroom

Kitchen

Study Room

Each room should display its devices.

Example:

Living Room

💡 Main Light
Status: ON
[ ON/OFF ]

🌀 Ceiling Fan
Status: ON
Speed: 3
[ ON/OFF ]

3. Device Control

Every device must have a working control.

For lights:

ON

OFF

For fans:

ON

OFF

Speed 1

Speed 2

Speed 3

Speed 4

Speed 5

For AC:

ON

OFF

Temperature control

For smart plugs:

ON

OFF

When the user changes a device state:

Frontend
→ Backend API
→ Database
→ Updated device state
→ Frontend updates immediately.

Do NOT fake the state only in React state.

Persist device states in the database.

4. Voice Commands

Add browser-based voice input.

User can say:

"Turn on the living room light"

"Turn off the bedroom fan"

"Set bedroom fan speed to 3"

"Turn off all lights"

"Turn on everything"

"Turn off everything"

Convert speech to text.

Then create a command-processing layer that extracts:

{
"device": "living_room_light",
"action": "ON"
}

or:

{
"device": "bedroom_fan",
"action": "SET_SPEED",
"value": 3
}

Execute the corresponding backend operation.

Display the recognized command and result.

Example:

🎤 You said:

"Turn on the living room light"

AI/System:

✓ Living room light turned ON.

5. Natural Language / AI Layer

Create a clean abstraction for an AI command parser.

The system should accept natural language such as:

"Make the bedroom comfortable"

"Switch on the light in my room"

"Turn everything off"

"Put the fan on speed 4"

"Turn on the lights at 7 PM"

For simple commands, use deterministic parsing first.

For complex commands, create an AI service abstraction that can later connect to an LLM API.

Do NOT hard-code an API key.

Use:

AI_API_KEY=
AI_BASE_URL=
AI_MODEL=

from environment variables.

The AI should return structured JSON rather than directly modifying the database.

Example:

{
"intent": "CONTROL_DEVICE",
"device": "bedroom_fan",
"action": "ON",
"parameters": {}
}

The backend validates this JSON before executing the command.

6. Automation

Create an Automation page.

Users should be able to create:

IF condition
THEN action

Example:

IF time = 19:00
THEN turn ON living room light

Example:

IF temperature > 30
THEN turn ON bedroom fan

Example:

IF time = 23:00
THEN turn OFF all lights

Allow users to:

Create rule

Edit rule

Enable/disable rule

Delete rule

Show active rules on the dashboard.

7. Simulation Engine

Because there is no physical hardware, create a software simulation engine.

The engine should maintain:

device status

simulated power consumption

fan speed

temperature

automation state

For example:

Light ON:
Power = 10W

Fan speed 1:
Power = 30W

Fan speed 5:
Power = 70W

AC ON:
Power = 1200W

Calculate simulated energy consumption based on device state and time.

Clearly label this as:

"Simulated Energy Usage"

Do not claim that it represents real electrical measurements.

8. Energy Analytics

Create an Analytics page.

Show:

Daily energy usage

Weekly energy usage

Device-wise energy consumption

Current simulated power usage

Use Recharts.

Charts:

Line chart

Bar chart

Pie/donut chart

Example:

Energy Usage

Today: 4.8 kWh

Living Room: 1.8 kWh
Bedroom: 1.2 kWh
Kitchen: 0.9 kWh
Other: 0.9 kWh

9. Command History

Create a command history page.

Store every command:

timestamp

user command

device

action

result

success/failure

Example:

09:32 AM
"Turn on bedroom fan"
✓ Successful

09:35 AM
"Turn off living room light"
✓ Successful

10. Database

Create proper Supabase SQL schema.

Tables:

users

rooms:

id

name

created_at

devices:

id

room_id

name

type

status

power_rating

created_at

device_states:

id

device_id

status

fan_speed

temperature

updated_at

automation_rules:

id

name

condition

action

enabled

created_at

command_history:

id

command

parsed_action

result

created_at

Add appropriate foreign keys and indexes.

Use Row Level Security where appropriate.

11. Backend API

Create clean REST endpoints.

Examples:

GET /api/rooms

GET /api/devices

GET /api/devices/:id

POST /api/devices/:id/toggle

POST /api/devices/:id/control

GET /api/automation

POST /api/automation

PUT /api/automation/:id

DELETE /api/automation/:id

POST /api/commands

GET /api/history

GET /api/analytics

Keep business logic separated from route handlers.

Use controllers/services where appropriate.

12. UI/UX

Design should look like a modern commercial smart-home application.

Use:

Clean cards

Smooth animations

Responsive layout

Dark/light mode

Sidebar navigation

Mobile responsive design

Device icons

Status indicators

Loading states

Empty states

Error handling

Toast notifications

Pages:

Dashboard

Rooms

Devices

Automations

Voice Control

Analytics

Command History

Settings

Do not make it look like a basic college CRUD project.

13. Project Structure

Use a clean structure such as:

frontend/
src/
components/
pages/
hooks/
services/
types/
utils/

backend/
src/
controllers/
routes/
services/
middleware/
utils/
types/

database/
schema.sql
seed.sql

README.md

.env.example

14. Seed Data

Provide sample data automatically.

Rooms:

Living Room
Bedroom
Kitchen
Study Room

Devices:

Living Room Light
Living Room Fan
Bedroom Light
Bedroom Fan
Kitchen Light
Study Light
Study Fan
Smart Plug

The project should work immediately after configuring Supabase.

15. Error Handling

Handle:

API failures

Database failures

Invalid commands

Unknown devices

Invalid fan speed

Missing environment variables

Voice recognition errors

Show useful user-friendly messages.

Never expose API keys or database credentials.

16. README

Create a complete README containing:

Project overview

Features

Architecture

Technology stack

Folder structure

Supabase setup

Environment variables

Database setup

Frontend setup

Backend setup

How to run

Voice command setup

AI API configuration

Example commands

Limitations

Future improvements

Clearly mention:

"This project is a software simulation of smart-home automation and does not directly control physical electrical appliances."

17. Most Important Requirement

Do NOT just generate UI mockups.

Everything should actually work:

Dashboard
→ API
→ Database
→ Device state
→ Automation
→ Voice command
→ Command history
→ Analytics

When I click:

TURN ON LIGHT

the actual device state in the database must change.

When I refresh the browser, the correct state must remain.

When I use a voice command, it must execute the corresponding device action.

Build the project incrementally and test each major feature before moving to the next one.

At the end, provide:

Complete source code

Database SQL

Environment variable example

Setup commands

API documentation

README

Test commands

Instructions to run the complete application locally

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dbda2e6e-80f9-4d69-9d31-fae5808ba064).

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
