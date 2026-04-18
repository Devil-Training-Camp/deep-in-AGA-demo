/**
 * VertCard 单元测试
 *
 * 由 testing-agent 自动生成，覆盖渲染、交互、边界情况。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VertCard } from './VertCard';

const defaultProps = {
  category: 'Tutorial',
  title: 'React 基础',
  duration: '45 min',
  avatars: [
    { src: 'https://example.com/avatar1.jpg', alt: 'Alice' },
    { src: 'https://example.com/avatar2.jpg', alt: 'Bob' },
  ],
};

describe('VertCard — 渲染', () => {
  it('显示分类、标题、时长文本', () => {
    render(<VertCard {...defaultProps} />);
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
    expect(screen.getByText('React 基础')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('显示头像并带有正确 alt 文字', () => {
    render(<VertCard {...defaultProps} />);
    expect(screen.getByAltText('Alice')).toHaveAttribute(
      'src',
      'https://example.com/avatar1.jpg'
    );
    expect(screen.getByAltText('Bob')).toHaveAttribute(
      'src',
      'https://example.com/avatar2.jpg'
    );
  });

  it('未提供 alt 时使用默认文本 Avatar N', () => {
    render(
      <VertCard
        {...defaultProps}
        avatars={[
          { src: 'https://example.com/avatar1.jpg' },
          { src: 'https://example.com/avatar2.jpg' },
        ]}
      />
    );
    expect(screen.getByAltText('Avatar 1')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar 2')).toBeInTheDocument();
  });

  it('显示 Play 按钮', () => {
    render(<VertCard {...defaultProps} />);
    expect(screen.getByText('Play')).toBeInTheDocument();
  });
});

describe('VertCard — 头像限制', () => {
  it('超过 4 个头像时只显示前 4 个', () => {
    render(
      <VertCard
        {...defaultProps}
        avatars={[
          { src: 'https://example.com/avatar1.jpg', alt: 'Avatar1' },
          { src: 'https://example.com/avatar2.jpg', alt: 'Avatar2' },
          { src: 'https://example.com/avatar3.jpg', alt: 'Avatar3' },
          { src: 'https://example.com/avatar4.jpg', alt: 'Avatar4' },
          { src: 'https://example.com/avatar5.jpg', alt: 'Avatar5' },
        ]}
      />
    );
    expect(screen.getByAltText('Avatar1')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar2')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar3')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar4')).toBeInTheDocument();
    expect(screen.queryByAltText('Avatar5')).not.toBeInTheDocument();
  });

  it('0 个头像时不显示任何图片', () => {
    render(<VertCard {...defaultProps} avatars={[]} />);
    const images = screen.queryAllByRole('img');
    expect(images).toHaveLength(0);
  });

  it('1 个头像时正常显示', () => {
    render(
      <VertCard
        {...defaultProps}
        avatars={[{ src: 'https://example.com/avatar.jpg', alt: 'Solo' }]}
      />
    );
    expect(screen.getByAltText('Solo')).toBeInTheDocument();
  });

  it('恰好 4 个头像时都显示', () => {
    render(
      <VertCard
        {...defaultProps}
        avatars={[
          { src: 'https://example.com/avatar1.jpg', alt: 'A1' },
          { src: 'https://example.com/avatar2.jpg', alt: 'A2' },
          { src: 'https://example.com/avatar3.jpg', alt: 'A3' },
          { src: 'https://example.com/avatar4.jpg', alt: 'A4' },
        ]}
      />
    );
    expect(screen.getByAltText('A1')).toBeInTheDocument();
    expect(screen.getByAltText('A2')).toBeInTheDocument();
    expect(screen.getByAltText('A3')).toBeInTheDocument();
    expect(screen.getByAltText('A4')).toBeInTheDocument();
  });
});

describe('VertCard — 交互', () => {
  it('点击 Play 按钮触发 onPlay 回调', () => {
    const onPlay = vi.fn();
    render(<VertCard {...defaultProps} onPlay={onPlay} />);
    fireEvent.click(screen.getByText('Play'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('未传 onPlay 时点击不报错', () => {
    render(<VertCard {...defaultProps} />);
    expect(() => fireEvent.click(screen.getByText('Play'))).not.toThrow();
  });
});

describe('VertCard — 边界情况', () => {
  it('超长标题正常显示不报错', () => {
    const longTitle = 'A'.repeat(200);
    render(<VertCard {...defaultProps} title={longTitle} />);
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('空字符串分类正常显示', () => {
    render(<VertCard {...defaultProps} category="" />);
    expect(screen.getByText('React 基础')).toBeInTheDocument();
  });

  it('混合有 alt 和无 alt 的头像', () => {
    render(
      <VertCard
        {...defaultProps}
        avatars={[
          { src: 'https://example.com/avatar1.jpg', alt: 'Named' },
          { src: 'https://example.com/avatar2.jpg' },
        ]}
      />
    );
    expect(screen.getByAltText('Named')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar 2')).toBeInTheDocument();
  });
});
