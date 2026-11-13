import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "./dashboard";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Dashboard,
});
