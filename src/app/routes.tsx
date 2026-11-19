import { createHashRouter, Navigate } from "react-router";
import { BadgePrintPage } from "./components/BadgePrintPage";

export const router = createHashRouter([
  { path: "/", element: <BadgePrintPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
