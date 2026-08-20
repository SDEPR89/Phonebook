import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(message: string, status: number = 400, details?: any) {
  const response: any = { error: { message } };
  
  if (details) {
    if (details instanceof ZodError) {
      response.error.details = details.format();
    } else {
      response.error.details = details;
    }
  }

  return NextResponse.json(response, { status });
}
