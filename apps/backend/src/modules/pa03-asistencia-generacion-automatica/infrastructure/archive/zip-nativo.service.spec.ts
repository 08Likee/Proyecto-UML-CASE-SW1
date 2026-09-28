import { ZipNativoService } from './zip-nativo.service';

describe('ZipNativoService', () => {
  it('produce un archivo ZIP con firma PK', async () => {
    const zip = await new ZipNativoService().crear([
      { ruta: 'hola.txt', contenido: 'hola' },
    ]);
    expect(zip.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(zip.includes(Buffer.from('hola.txt'))).toBe(true);
  });
});
