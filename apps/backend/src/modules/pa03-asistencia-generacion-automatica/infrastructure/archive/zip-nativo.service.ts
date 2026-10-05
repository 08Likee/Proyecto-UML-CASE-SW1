import { Injectable } from '@nestjs/common';
import { deflateRawSync } from 'node:zlib';
import { ArchivoZipService } from '../../application/ports/archivo-zip.service';
import type { ArchivoGenerado } from '../../domain/models/generacion-backend';

const DOS_DATE_1980_01_01 = 0x0021;

interface EntradaZip {
  nombre: Buffer;
  datosOriginales: Buffer;
  datosComprimidos: Buffer;
  crc32: number;
  offsetLocal: number;
}

@Injectable()
export class ZipNativoService implements ArchivoZipService {
  async crear(archivos: ArchivoGenerado[]): Promise<Buffer> {
    const entradas: EntradaZip[] = [];
    const locales: Buffer[] = [];
    let offset = 0;

    for (const archivo of archivos) {
      const nombre = Buffer.from(archivo.ruta.replaceAll('\\', '/'), 'utf8');
      const datosOriginales = Buffer.isBuffer(archivo.contenido)
        ? archivo.contenido
        : Buffer.from(archivo.contenido, 'utf8');
      const datosComprimidos = deflateRawSync(datosOriginales);
      const entrada: EntradaZip = {
        nombre,
        datosOriginales,
        datosComprimidos,
        crc32: crc32(datosOriginales),
        offsetLocal: offset,
      };
      const cabecera = cabeceraLocal(entrada);
      locales.push(cabecera, datosComprimidos);
      offset += cabecera.length + datosComprimidos.length;
      entradas.push(entrada);
    }

    const centrales = entradas.map((entrada) => cabeceraCentral(entrada));
    const tamanoCentral = centrales.reduce(
      (total, buffer) => total + buffer.length,
      0,
    );
    const fin = finDirectorioCentral(entradas.length, tamanoCentral, offset);
    return Buffer.concat([...locales, ...centrales, fin]);
  }
}

function cabeceraLocal(entrada: EntradaZip): Buffer {
  const buffer = Buffer.alloc(30 + entrada.nombre.length);
  let o = 0;
  o = u32(buffer, o, 0x04034b50);
  o = u16(buffer, o, 20);
  o = u16(buffer, o, 0x0800);
  o = u16(buffer, o, 8);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, DOS_DATE_1980_01_01);
  o = u32(buffer, o, entrada.crc32);
  o = u32(buffer, o, entrada.datosComprimidos.length);
  o = u32(buffer, o, entrada.datosOriginales.length);
  o = u16(buffer, o, entrada.nombre.length);
  o = u16(buffer, o, 0);
  entrada.nombre.copy(buffer, o);
  return buffer;
}

function cabeceraCentral(entrada: EntradaZip): Buffer {
  const buffer = Buffer.alloc(46 + entrada.nombre.length);
  let o = 0;
  o = u32(buffer, o, 0x02014b50);
  o = u16(buffer, o, 20);
  o = u16(buffer, o, 20);
  o = u16(buffer, o, 0x0800);
  o = u16(buffer, o, 8);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, DOS_DATE_1980_01_01);
  o = u32(buffer, o, entrada.crc32);
  o = u32(buffer, o, entrada.datosComprimidos.length);
  o = u32(buffer, o, entrada.datosOriginales.length);
  o = u16(buffer, o, entrada.nombre.length);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, 0);
  o = u32(buffer, o, 0);
  o = u32(buffer, o, entrada.offsetLocal);
  entrada.nombre.copy(buffer, o);
  return buffer;
}

function finDirectorioCentral(
  cantidad: number,
  tamanoCentral: number,
  offsetCentral: number,
): Buffer {
  const buffer = Buffer.alloc(22);
  let o = 0;
  o = u32(buffer, o, 0x06054b50);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, 0);
  o = u16(buffer, o, cantidad);
  o = u16(buffer, o, cantidad);
  o = u32(buffer, o, tamanoCentral);
  o = u32(buffer, o, offsetCentral);
  u16(buffer, o, 0);
  return buffer;
}

function u16(buffer: Buffer, offset: number, valor: number): number {
  buffer.writeUInt16LE(valor & 0xffff, offset);
  return offset + 2;
}

function u32(buffer: Buffer, offset: number, valor: number): number {
  buffer.writeUInt32LE(valor >>> 0, offset);
  return offset + 4;
}

function crc32(datos: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of datos) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
