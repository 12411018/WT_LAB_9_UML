# WT_LAB_9_UML

## Classcraft — UML Studio

An interactive React UML class-diagram editor with Java source generation.

**Assignment by Nikhil Nikalje**

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`.

## Use the editor

- Add a class, select it, and edit its name, attributes, and methods in the inspector.
- Drag class cards around the canvas to arrange the diagram.
- Add association, inheritance, or dependency relationships and optionally label them.
- Select a relationship in the relationship list to inspect or remove it.
- Open **Generate Java** to preview or download the diagram as `Diagram.java`.

Attributes use `name: Type` (for example, `price: double`). Methods use
`methodName(arg: Type): ReturnType` (for example, `find(id: int): String`).
The generator emits package-private Java classes, maps `Date` to
`java.util.Date`, and uses the first outgoing inheritance relationship as
the Java `extends` clause.

## Example diagram

The starter diagram contains `User`, `Order`, and `Product` classes, with
association relationships between them. The editor supports adding other
class structures and relationship types at runtime.
