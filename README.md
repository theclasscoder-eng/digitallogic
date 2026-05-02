# Logic Gate Designer

Logic Gate Designer is an interactive digital logic circuit builder for class use.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Flow (`@xyflow/react`)
- Zustand state management

## Features

- Drag-and-drop logic canvas with zoom, pan, minimap, and snap-ready handles
- Input nodes for `A, B, C, D, X1, X2, X3`, constants `0/1`, and custom labels
- Gate nodes: `AND, OR, NOT, NAND, NOR, XOR, XNOR`
- Dynamic gate inputs (where valid), with connection validation and loop prevention
- Output nodes (`F` by default, custom labels supported)
- Real-time simulation with live wire highlighting for high/low signals
- Boolean expression generation per output
- Auto truth table generation from used variables
- Undo/redo and clear canvas
- Save/load from browser `localStorage`
- Import/export JSON design files
- Export canvas as PNG image

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```text
logic-gate-designer/
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  index.html
  README.md

  /src
    main.tsx
    App.tsx
    index.css

    /components
      Sidebar.tsx
      Toolbar.tsx
      Canvas.tsx
      TruthTable.tsx
      ExpressionPanel.tsx
      PropertiesPanel.tsx

    /nodes
      InputNode.tsx
      GateNode.tsx
      OutputNode.tsx

    /logic
      evaluateCircuit.ts
      generateExpression.ts
      generateTruthTable.ts
      gateDefinitions.ts
      validation.ts

    /state
      useCircuitStore.ts

    /types
      circuit.ts
```
"# digitallogic" 
