import type { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import {
  createJobRoleSchema,
  updateJobRoleSchema,
} from "./jobRole.validation";
import * as jobRoleService from "./jobRole.service";

function requireId(
  value: string | undefined
): string {
  if (!value) {
    throw ApiError.badRequest(
      "Job role ID is required"
    );
  }

  return value;
}

export const create = asyncHandler(
  async (req: Request, res: Response) => {
    const input =
      createJobRoleSchema.parse(req.body);

    const role =
      await jobRoleService.createJobRole(input);

    res.status(201).json({
      jobRole: role,
    });
  }
);

export const list = asyncHandler(
  async (_req: Request, res: Response) => {
    const roles =
      await jobRoleService.listJobRoles();

    res.status(200).json({
      jobRoles: roles,
    });
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = requireId(req.params.id);

    const role =
      await jobRoleService.getJobRole(id);

    res.status(200).json({
      jobRole: role,
    });
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response) => {
    const id = requireId(req.params.id);

    const input =
      updateJobRoleSchema.parse(req.body);

    const role =
      await jobRoleService.updateJobRole(
        id,
        input
      );

    res.status(200).json({
      jobRole: role,
    });
  }
);