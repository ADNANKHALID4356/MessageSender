import {
  cn,
  formatDate,
  formatDateTime,
  formatTimeAgo,
  truncate,
  formatNumber,
  formatPercentage,
  getInitials,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (class name merger)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'included', false && 'excluded')).toBe('base included');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-06-20');
      expect(result).toContain('Jun');
      expect(result).toContain('20');
    });
  });

  describe('formatDateTime', () => {
    it('should include time in formatted output', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });
  });

  describe('formatTimeAgo', () => {
    it('should return "Just now" for recent dates', () => {
      const now = new Date();
      expect(formatTimeAgo(now)).toBe('Just now');
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      expect(formatTimeAgo(date)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(formatTimeAgo(date)).toBe('3h ago');
    });

    it('should return days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      expect(formatTimeAgo(date)).toBe('2d ago');
    });

    it('should return formatted date for older dates', () => {
      const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      const result = formatTimeAgo(date);
      expect(result).not.toContain('ago');
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers as is', () => {
      expect(formatNumber(500)).toBe('500');
    });

    it('should format thousands with K', () => {
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(10000)).toBe('10.0K');
    });

    it('should format millions with M', () => {
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(10000000)).toBe('10.0M');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimals as percentage', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(0.123)).toBe('12.3%');
      expect(formatPercentage(1)).toBe('100.0%');
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should get single initial from single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should limit to 2 characters', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });
});
