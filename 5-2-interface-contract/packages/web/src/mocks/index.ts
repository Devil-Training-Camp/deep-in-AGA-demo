/**
 * MSW 浏览器 worker 的启动入口。
 *
 * 何时启动:仅当【开发模式】且【显式开关打开】时。两道闸的分工不同——
 *  - `process.env.NODE_ENV === "development"`:构建期静态可知的常量,生产构建下整个
 *    分支连同对 ./browser 的动态 import 会被打包器 tree-shake 掉,保证 MSW 代码不进生产包。
 *  - `VITE_USE_MSW === "true"`:运行期开关,开发时也能一键关掉 mock 走真实后端。
 *
 * 关于环境变量名:`VITE_USE_MSW` 是 Vite 约定的名字,但本项目是 Next.js——Next 只把
 * `NEXT_PUBLIC_` 前缀的变量注入客户端 bundle,浏览器里直接读裸 `VITE_USE_MSW` 恒为
 * undefined。因此真正的开关判定放在服务端的 layout(Server Component,可读任意 env)里,
 * 由它把结果作为 prop 传给客户端组件再调用 {@link enableMocking};这里对 env 的再判断只是
 * 客户端侧的防御性兜底。
 *
 * 动态 import:./browser 只在闸门通过后才被 import,既避免 setupWorker 在服务端求值,
 * 也确保生产包不包含 MSW。
 */

/** 是否应启用 mock:开发模式 + 开关打开。构建期常量参与判断,便于生产 tree-shake。 */
export function shouldEnableMocking(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.VITE_USE_MSW === "true"
  );
}

/**
 * 按需启动浏览器 worker。未命中闸门时直接返回,不触碰 MSW 代码。
 * `onUnhandledRequest: "bypass"` —— 未匹配的请求放行走真实网络,避免 mock 未覆盖的接口报错。
 */
export async function enableMocking(): Promise<void> {
  if (!shouldEnableMocking()) return;

  const { worker } = await import("./browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}
