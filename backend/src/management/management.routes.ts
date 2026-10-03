import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as managementController from "./management.controller";

export const managementRouter = Router();

managementRouter.use(requireAuth, requireRole("MANAGEMENT", "SUPER_ADMIN"));

managementRouter.get("/dashboard", managementController.dashboard);
managementRouter.get("/candidates", managementController.listCandidates);
managementRouter.get("/candidates/:id", managementController.getCandidate);
managementRouter.put("/candidates/:id/status", managementController.updateShortlist);

// Account provisioning — spec §2 "Manage management accounts" is a
// SUPER_ADMIN-only capability, narrower than the rest of this router.
const usersRouter = Router();
usersRouter.use(requireRole("SUPER_ADMIN"));
usersRouter.post("/", managementController.createManagementUser);
managementRouter.use("/users", usersRouter);
