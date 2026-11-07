import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/gst")({
  beforeLoad: () => {
    throw redirect({ to: "/apps" });
  },
  component: () => null,
});
