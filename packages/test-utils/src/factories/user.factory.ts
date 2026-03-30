export interface MockUser {
  id: string;
  email: string;
  password: string | null;
  nickname: string | null;
  profileImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let userCounter = 0;

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  userCounter++;
  return {
    id: `user-${userCounter}`,
    email: `user${userCounter}@test.com`,
    password: '$2b$10$hashedpassword',
    nickname: `testuser${userCounter}`,
    profileImage: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function resetUserCounter() {
  userCounter = 0;
}
