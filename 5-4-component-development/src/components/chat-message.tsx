"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot, FileCheck2, Lightbulb, RotateCcw, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/** 对应 architecture-design.md 数据模型：role IN ('user','assistant')。 */
type ChatRole = "user" | "assistant"

/**
 * 消息状态，对应 SSE 契约：
 * - streaming：正在逐 token 渲染（含尚未收到首字节的等待态）
 * - done：完整生成结束
 * - error：流内 `event: error` 或中断，展示重试入口
 */
type ChatStatus = "streaming" | "done" | "error"

interface ChatMessageProps {
  role: ChatRole
  /** 已到达的消息内容；assistant 走 markdown 渲染，user 按纯文本处理。 */
  content?: string
  status?: ChatStatus
  /**
   * 依据标注，对应 SSE `event: meta {grounded}`：
   * true=命中文档依据，false=转常识推测，undefined=不展示标注。
   */
  grounded?: boolean
  /** error 态下的提示文案（来自 `event: error` 的 message）。 */
  errorMessage?: string
  /** 点击「重试」触发；error 态且传入时才渲染重试按钮。 */
  onRetry?: () => void
  className?: string
}

/** 流式等待首字节时的打字指示器：三个依次跳动的圆点。 */
function TypingIndicator() {
  return (
    <span
      className="inline-flex items-center gap-xs py-xs"
      role="status"
      aria-label="正在生成回答"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-foreground-subtle"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

/** grounded 标注徽标：命中依据走 accent，常识推测走 warning。 */
function GroundedBadge({ grounded }: { grounded: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs rounded-md px-sm py-xs text-xs font-medium",
        grounded
          ? "bg-accent-subtle text-accent"
          : "bg-warning-subtle text-warning"
      )}
    >
      {grounded ? (
        <>
          <FileCheck2 className="size-3" />
          依据文档
        </>
      ) : (
        <>
          <Lightbulb className="size-3" />
          常识推测
        </>
      )}
    </span>
  )
}

/**
 * assistant markdown 正文。react-markdown 的 components 映射一律走 token 工具类，
 * 不出现裸色值/裸像素——保证亮/暗主题自动跟随。
 */
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-sm text-md text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="leading-relaxed" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-primary underline underline-offset-2 hover:text-primary-hover"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="ml-md list-disc space-y-xs" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="ml-md list-decimal space-y-xs" {...props} />
          ),
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-foreground-heading" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-lg font-semibold text-foreground-heading" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-semibold text-foreground-heading" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-md font-semibold text-foreground-heading" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-2 border-border-strong pl-md text-foreground-muted"
              {...props}
            />
          ),
          code: ({ node, className: codeClass, children, ...props }) => {
            const isBlock = /language-/.test(codeClass ?? "")
            return isBlock ? (
              <code
                className="block overflow-x-auto rounded-md bg-surface-muted p-md font-mono text-sm text-foreground"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="rounded-sm bg-surface-muted px-xs py-px font-mono text-sm text-foreground"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ node, ...props }) => <pre className="overflow-x-auto" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-sm text-foreground"
                {...props}
              />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="border border-border px-sm py-xs text-left font-medium text-foreground-heading"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-border px-sm py-xs" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * 单条对话消息。同时承载：
 * - user / assistant 两种角色（气泡左右区分、色彩区分）
 * - assistant 的 markdown 渲染
 * - 流式加载中的打字指示器
 * - 中断 / 流内错误的重试入口
 */
function ChatMessage({
  role,
  content = "",
  status = "done",
  grounded,
  errorMessage,
  onRetry,
  className,
}: ChatMessageProps) {
  const isUser = role === "user"
  // 等待首字节：流式中但一个 token 都还没到。
  const isWaitingFirstToken = status === "streaming" && content.length === 0
  const isError = status === "error"

  const Avatar = (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-surface-muted text-foreground-muted"
      )}
      aria-hidden="true"
    >
      {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
    </span>
  )

  return (
    <div
      data-role={role}
      className={cn(
        "flex w-full gap-sm",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {Avatar}

      <div
        className={cn(
          "flex min-w-0 max-w-[75%] flex-col gap-xs",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* 气泡本体 */}
        <div
          className={cn(
            "rounded-lg px-md py-sm text-md",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface text-foreground"
          )}
        >
          {isWaitingFirstToken ? (
            <TypingIndicator />
          ) : isUser ? (
            // 用户输入按纯文本渲染，保留换行、不解释 markdown。
            <p className="leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </p>
          ) : (
            <AssistantMarkdown content={content} />
          )}
        </div>

        {/* 依据标注：仅 assistant、有内容、非错误态时展示 */}
        {!isUser && !isError && grounded !== undefined && content.length > 0 && (
          <GroundedBadge grounded={grounded} />
        )}

        {/* 错误 / 中断态：展示提示与重试入口 */}
        {isError && (
          <Alert variant="destructive" className="mt-xs w-full">
            <AlertTitle>回答未完成</AlertTitle>
            <AlertDescription>
              {errorMessage ?? "生成过程中断，请重试。"}
            </AlertDescription>
            {onRetry && (
              <div className="mt-sm">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onRetry}
                >
                  <RotateCcw />
                  重试
                </Button>
              </div>
            )}
          </Alert>
        )}
      </div>
    </div>
  )
}

export { ChatMessage }
export type { ChatMessageProps, ChatRole, ChatStatus }
