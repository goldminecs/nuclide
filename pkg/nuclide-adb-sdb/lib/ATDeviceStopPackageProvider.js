/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import typeof * as AdbService from '../../nuclide-adb-sdb-rpc/lib/AdbService';
import type {
  DeviceProcessTaskProvider,
  Process,
  ProcessTaskType,
} from '../../nuclide-devices/lib/types';
import type {NuclideUri} from 'nuclide-commons/nuclideUri';

export class ATDeviceStopPackageProvider implements DeviceProcessTaskProvider {
  _type: string;
  _rpcFactory: (host: NuclideUri) => AdbService;

  constructor(type: string, rpcFactory: (host: NuclideUri) => AdbService) {
    this._type = type;
    this._rpcFactory = rpcFactory;
  }

  getType(): string {
    return this._type;
  }

  getTaskType(): ProcessTaskType {
    return 'STOP_PACKAGE';
  }

  getName(): string {
    return 'Stop package';
  }

  isSupported(proc: Process): boolean {
    return true;
  }

  getSupportedPIDs(
    host: NuclideUri,
    device: string,
    procs: Process[],
  ): Promise<Set<number>> {
    return Promise.resolve(new Set(procs.map(proc => proc.pid)));
  }

  async run(host: NuclideUri, device: string, proc: Process): Promise<void> {
    return this._rpcFactory(host).killProcess(device, proc.name);
  }
}
