/**
 * UserCard 单元测试
 *
 * 由 testing-agent 自动生成，覆盖渲染、交互、边界情况。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './UserCard';

const defaultProps = {
  avatar: 'https://example.com/avatar.jpg',
  name: '张三',
  username: 'zhangsan',
};

describe('UserCard — 渲染', () => {
  it('显示用户名和账号', () => {
    render(<UserCard {...defaultProps} />);
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('@zhangsan')).toBeInTheDocument();
  });

  it('显示头像并带有正确 alt 文字', () => {
    render(<UserCard {...defaultProps} />);
    const img = screen.getByAltText('张三 的头像');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('有 bio 时显示，无 bio 时不渲染', () => {
    const { rerender } = render(<UserCard {...defaultProps} bio="前端开发者" />);
    expect(screen.getByText('前端开发者')).toBeInTheDocument();

    rerender(<UserCard {...defaultProps} />);
    expect(screen.queryByText('前端开发者')).not.toBeInTheDocument();
  });

  it('有 followersCount 时显示，无时不渲染', () => {
    const { rerender } = render(<UserCard {...defaultProps} followersCount={1234} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();

    rerender(<UserCard {...defaultProps} />);
    expect(screen.queryByText('位关注者')).not.toBeInTheDocument();
  });
});

describe('UserCard — 关注状态', () => {
  it('默认显示"关注"按钮', () => {
    render(<UserCard {...defaultProps} />);
    expect(screen.getByText('关注')).toBeInTheDocument();
  });

  it('isFollowing=true 时显示"已关注"', () => {
    render(<UserCard {...defaultProps} isFollowing={true} />);
    expect(screen.getByText('已关注')).toBeInTheDocument();
  });
});

describe('UserCard — 交互', () => {
  it('点击关注按钮触发 onFollow 回调', () => {
    const onFollow = vi.fn();
    render(<UserCard {...defaultProps} onFollow={onFollow} />);
    fireEvent.click(screen.getByText('关注'));
    expect(onFollow).toHaveBeenCalledOnce();
  });

  it('点击更多按钮触发 onMore 回调', () => {
    const onMore = vi.fn();
    render(<UserCard {...defaultProps} onMore={onMore} />);
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }));
    expect(onMore).toHaveBeenCalledOnce();
  });

  it('未传 onFollow 时点击不报错', () => {
    render(<UserCard {...defaultProps} />);
    expect(() => fireEvent.click(screen.getByText('关注'))).not.toThrow();
  });
});

describe('UserCard — 边界情况', () => {
  it('超长用户名正常截断不溢出', () => {
    const longName = 'A'.repeat(100);
    render(<UserCard {...defaultProps} name={longName} />);
    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('followersCount 为 0 时正常显示', () => {
    render(<UserCard {...defaultProps} followersCount={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
