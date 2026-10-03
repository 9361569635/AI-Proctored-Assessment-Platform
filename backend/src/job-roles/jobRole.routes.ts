import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as jobRoleController from "./jobRole.controller";

export const jobRoleRouter = Router();

jobRoleRouter.get("/", jobRoleController.list);
jobRoleRouter.get("/:id", jobRoleController.getById);

jobRoleRouter.post("/", requireAuth, requireRole("MANAGEMENT", "SUPER_ADMIN"), jobRoleController.create);
jobRoleRouter.put("/:id", requireAuth, requireRole("MANAGEMENT", "SUPER_ADMIN"), jobRoleController.update);
