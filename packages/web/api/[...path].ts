import { handle } from "hono/vercel";
import app from "../src/api/index.js";

export const config = {
  runtime: "edge",
};

export default handle(app);
