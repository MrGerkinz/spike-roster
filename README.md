# Volleyball Roster Generator

A web application for creating optimized rotation schedules for volleyball sessions. Generates fair court assignments that maximize teammate diversity and distribute byes evenly.

## Features

- **CSV Import**: Upload a CSV file with player names or add players manually
- **Configurable Settings**: Adjust courts (2-4), team size (3-6), and rounds (4-10)
- **Smart Optimization**: Uses greedy construction with local swap refinement
  - Maximizes unique teammate pairings
  - Minimizes repeated teammate assignments
  - Distributes byes fairly across all players
- **Fairness Statistics**: View detailed stats on bye distribution and teammate diversity
- **Export Options**: Download as CSV or print directly from browser

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Add Players**: 
   - Upload a CSV file with player names (one per line)
   - Or click "Add players manually" to enter names one by one

2. **Configure Session**:
   - Select number of courts (2-4)
   - Set players per team (default: 4)
   - Choose number of rounds (default: 6)

3. **Generate Schedule**:
   - Click "Generate Schedule" to create the rotation
   - Review the rotation matrix and fairness statistics
   - Click "Regenerate Schedule" for a different arrangement

4. **Export**:
   - Click "Export CSV" to download the schedule
   - Click "Print" for a print-friendly view

## CSV Format

### Input (Player List)
Simple one-column format:
```csv
Name
Alice
Bob
Charlie
Diana
```

Or just names without header:
```csv
Alice
Bob
Charlie
Diana
```

### Output (Rotation Schedule)
```csv
Player Name,Round 1,Round 2,Round 3,Round 4,Round 5,Round 6
Alice,1A,2B,BYE,3A,1B,2A
Bob,1A,BYE,1B,2A,3B,1A
...
```

## Algorithm

The scheduling algorithm uses a two-phase approach:

### Phase 1: Greedy Construction
- Assigns byes first to players with the fewest total byes
- Builds teams by selecting players who haven't played together recently
- Tracks a pairing matrix to count teammate history

### Phase 2: Local Swap Refinement
- Identifies players in bottom 10% for unique teammate count
- Attempts position swaps to improve their teammate diversity
- Accepts improvements even if slightly reducing global optimization

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (recommended)

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Deploy automatically

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## License

MIT
