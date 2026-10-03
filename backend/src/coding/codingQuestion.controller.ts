import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as codingQuestionService from "./codingQuestion.service";
import type { CreateCodingQuestionInput } from "./codingQuestion.validation";

/**
 * Create a coding question
 */
export const create = asyncHandler(
  async (req: Request, res: Response) => {
    const input = req.body as CreateCodingQuestionInput;

    if (!input) {
      throw ApiError.badRequest(
        "Coding question data is required"
      );
    }

    const question =
      await codingQuestionService.createCodingQuestion(input);

    res.status(201).json({
      codingQuestion: question,
    });
  }
);

/**
 * List coding questions.
 * Hidden test-case data is redacted by the service.
 */
export const list = asyncHandler(
  async (_req: Request, res: Response) => {
    const questions =
      await codingQuestionService.listCodingQuestions();

    res.status(200).json({
      codingQuestions: questions,
    });
  }
);

/**
 * Get a coding question by ID.
 * Hidden test-case data is redacted by the service.
 */
export const getById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw ApiError.badRequest(
        "Coding question ID is required"
      );
    }

    const question =
      await codingQuestionService.getCodingQuestion(id);

    res.status(200).json({
      codingQuestion: question,
    });
  }
);