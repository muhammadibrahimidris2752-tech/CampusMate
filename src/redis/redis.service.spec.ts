import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: {
    connect: jest.Mock;
    quit: jest.Mock;
    disconnect: jest.Mock;
    on: jest.Mock;
    ping: jest.Mock;
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      on: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockClient);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              host: 'localhost',
              port: 6379,
              password: undefined,
              tls: false,
              keyPrefix: 'nsp:',
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers an error listener so a Redis error never crashes the process', () => {
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('connects on module init and does not throw if the connection fails', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('reports healthy via ping()', async () => {
    mockClient.ping.mockResolvedValueOnce('PONG');
    await expect(service.ping()).resolves.toBe(true);
  });

  it('reports unhealthy via ping() when the client throws', async () => {
    mockClient.ping.mockRejectedValueOnce(new Error('down'));
    await expect(service.ping()).resolves.toBe(false);
  });

  it('quits the client cleanly on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockClient.quit).toHaveBeenCalled();
  });

  it('delegates get/set/del to the underlying client', async () => {
    await service.set('key', 'value', 60);
    expect(mockClient.set).toHaveBeenCalledWith('key', 'value', 'EX', 60);

    await service.get('key');
    expect(mockClient.get).toHaveBeenCalledWith('key');

    await service.del('key');
    expect(mockClient.del).toHaveBeenCalledWith('key');
  });
});
