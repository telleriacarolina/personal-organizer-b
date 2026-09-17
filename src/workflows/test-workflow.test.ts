import { describe, expect, it } from "vitest";
import { normalizeInputStep, testWorkflow } from "./test-workflow";

describe("workflow infrastructure", () => {
  it("compiles workflow directives and allows step unit execution", async () => {
    await expect(testWorkflow("  hello  ")).rejects.toThrow(
      "You attempted to execute workflow testWorkflow function directly",
    );
    await expect(normalizeInputStep("  step  ")).resolves.toBe("step");
  });
});
