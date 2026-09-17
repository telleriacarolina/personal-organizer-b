export async function normalizeInputStep(input: string) {
  "use step";
  return input.trim();
}

export async function testWorkflow(input: string) {
  "use workflow";
  const message = await normalizeInputStep(input);
  return {
    message,
    status: "success" as const,
  };
}
