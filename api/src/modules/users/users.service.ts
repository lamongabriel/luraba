import { ConflictError, NotFoundError } from '@/shared/errors';
import { hashPassword } from '@/shared/auth';
import * as usersRepository from './users.repository';
import { CreateUserDto, UpdatePreferencesDto, UpdateUserDto, User, UserPreferences } from './users.types';

export async function getAllUsers(): Promise<User[]> {
  return usersRepository.findAllUsers();
}

export async function getUserById(id: number): Promise<User> {
  const user = await usersRepository.findUserById(id);
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const existing = await usersRepository.findUserByEmail(dto.email);
  if (existing) throw new ConflictError('A user with this email already exists');
  const passwordHash = await hashPassword(dto.password);
  return usersRepository.createUser({
    name: dto.name,
    email: dto.email,
    passwordHash,
  });
}

export async function updateUser(id: number, dto: UpdateUserDto): Promise<User> {
  await getUserById(id); // throws NotFoundError if missing

  if (dto.email) {
    const existing = await usersRepository.findUserByEmail(dto.email);
    if (existing && existing.id !== id) {
      throw new ConflictError('A user with this email already exists');
    }
  }

  const updated = await usersRepository.updateUser(id, {
    name: dto.name,
    email: dto.email,
    passwordHash: dto.password ? await hashPassword(dto.password) : undefined,
  });
  if (!updated) throw new NotFoundError('User');
  return updated;
}

export async function deleteUser(id: number): Promise<User> {
  const deleted = await usersRepository.deleteUser(id);
  if (!deleted) throw new NotFoundError('User');
  return deleted;
}

export async function getUserPreferences(userId: number): Promise<UserPreferences> {
  const preferences = await usersRepository.getUserPreferences(userId);
  if (!preferences) throw new NotFoundError('User');
  return preferences;
}

export async function updateUserPreferences(userId: number, dto: UpdatePreferencesDto): Promise<UserPreferences> {
  await getUserById(userId);
  const updated = await usersRepository.updateUserPreferences(userId, dto);
  if (!updated) throw new NotFoundError('User');
  return updated;
}