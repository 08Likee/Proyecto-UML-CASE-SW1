import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let queryMock: jest.Mock;

  beforeEach(() => {
    queryMock = jest.fn().mockResolvedValue([{ result: 1 }]);

    const dataSource = {
      query: queryMock,
    } as unknown as DataSource;

    service = new HealthService(dataSource);
  });

  it('debe informar que el backend y la base de datos están operativos', async () => {
    const result = await service.getHealth();

    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
    expect(result.status).toBe('ok');
    expect(result.service).toBe('backend');
    expect(result.database).toBe('connected');
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
