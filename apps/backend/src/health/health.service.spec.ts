import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('debe informar que el backend está operativo', () => {
    const result = service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('backend');
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
