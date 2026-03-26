import { ConflictError, NotFoundError } from '@/shared/errors';
import * as merchantsRepository from './merchants.repository';
import { CreateMerchantDto, Merchant } from './merchants.types';

export async function createMerchant(userId: string, dto: CreateMerchantDto): Promise<Merchant> {
  const user = await merchantsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const existing = await merchantsRepository.findByUserAndName(userId, dto.name);
  if (existing) throw new ConflictError('A merchant with this name already exists');

  return merchantsRepository.createMerchant({
    ...dto,
    userId,
  });
}

export async function listMerchants(userId: string): Promise<Merchant[]> {
  const user = await merchantsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  return merchantsRepository.listByUserId(userId);
}
