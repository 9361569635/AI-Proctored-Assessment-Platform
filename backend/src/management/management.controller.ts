import type { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

import {
  createManagementUserSchema,
  listCandidatesQuerySchema,
  updateShortlistSchema,
} from "./management.validation";

import * as managementService from "./management.service";

function requireId(
  value: string | undefined
): string {
  if (!value) {
    throw ApiError.badRequest(
      "Candidate ID is required"
    );
  }

  return value;
}

export const createManagementUser =
  asyncHandler(
    async (req: Request, res: Response) => {
      const input =
        createManagementUserSchema.parse(
          req.body
        );

      const user =
        await managementService.createManagementUser(
          input
        );

      res.status(201).json({
        user,
      });
    }
  );

export const dashboard = asyncHandler(
  async (_req: Request, res: Response) => {
    const data =
      await managementService.getDashboard();

    res.status(200).json(data);
  }
);

export const listCandidates = asyncHandler(
  async (req: Request, res: Response) => {
    const filters =
      listCandidatesQuerySchema.parse(
        req.query
      );

    const candidates =
      await managementService.listCandidates(
        filters
      );

    res.status(200).json({
      candidates,
    });
  }
);

export const getCandidate = asyncHandler(
  async (req: Request, res: Response) => {
    const id = requireId(req.params.id);

    const detail =
      await managementService.getCandidateDetail(
        id
      );

    res.status(200).json(detail);
  }
);

export const updateShortlist =
  asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const id = requireId(
        req.params.id
      );

      const input =
        updateShortlistSchema.parse(
          req.body
        );

      const shortlisting =
        await managementService.updateShortlistStatus(
          req.user.id,
          id,
          input
        );

      res.status(200).json({
        shortlisting,
      });
    }
  );