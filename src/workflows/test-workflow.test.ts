import { describe, expect, it } from "vitest";
import { normalizeInputStep, testWorkflow } from "./test-workflow";

describe("workflow infrastructure", () => {
  it("runs the workflow function and uses a step function", async () => {
    await expect(testWorkflow("  hello  ")).resolves.toEqual({
      message: "hello",
      status: "success",
    });
    await expect(normalizeInputStep("  step  ")).resolves.toBe("step");
  });
});
