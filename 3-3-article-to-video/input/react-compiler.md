# React Compiler 是怎么消除手写 memoization 的

React 应用的性能优化里,`useMemo`、`useCallback`、`React.memo` 是绕不开的三件套。它们的作用是在依赖不变时跳过重复计算和重复渲染,但代价是开发者要手动判断"哪些值需要缓存、依赖数组怎么写"——判断错了轻则失效,重则引入难以察觉的 bug。

React Compiler 的目标,是把这件事从开发者手里接管过来:你照常写普通组件,编译器在构建期自动插入等价的缓存逻辑。

## 手写 memoization 的问题

先看一段典型的手写优化代码。一个列表组件,每次父组件渲染都会重算 `filtered`,于是用 `useMemo` 包起来:

```tsx
function ProductList({ products, keyword }) {
  const filtered = useMemo(
    () => products.filter((p) => p.name.includes(keyword)),
    [products, keyword]
  );
  return <List items={filtered} />;
}
```

这段代码有两个隐患。第一,依赖数组要手动维护,漏写一个依赖就会读到旧值;多写一个又会让缓存频繁失效。第二,`useMemo` 本身有成本——它要存储上一次的值和依赖,只有当重算成本明显高于这点开销时才划算,但开发者很难每次都判断准。

## 编译器接管之后

启用 React Compiler 后,上面的组件可以退回到最朴素的写法:

```tsx
function ProductList({ products, keyword }) {
  const filtered = products.filter((p) => p.name.includes(keyword));
  return <List items={filtered} />;
}
```

编译器会在编译期分析数据流,自动推断出 `filtered` 依赖 `products` 和 `keyword`,并生成等价的缓存代码。开发者不再需要写 `useMemo`,也不再需要维护依赖数组——依赖关系由编译器从代码结构里直接读出来,不会漏也不会多。

## 它依赖什么前提

编译器能做这件事,前提是组件遵守 React 的规则:渲染过程是纯函数,不在渲染期产生副作用,不直接修改 props 和 state。这些规则本来就是 React 推荐的写法,只是过去没有强制。React Compiler 把"遵守规则"变成了"获得自动优化"的条件——写得越规范,编译器能优化的范围越大。

换句话说,React Compiler 不是一个让你可以乱写代码的魔法,而是把"写规范的 React"和"获得性能优化"这两件事绑定到了一起。
