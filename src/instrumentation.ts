export async function register() {
  const { validateProductionEnvironment } = await import("@/lib/env/production");
  validateProductionEnvironment();
}
