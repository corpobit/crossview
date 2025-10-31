export class CrossplaneResource {
  constructor(data) {
    this.apiVersion = data.apiVersion;
    this.kind = data.kind;
    this.metadata = data.metadata;
    this.spec = data.spec;
    this.status = data.status;
  }

  get name() {
    return this.metadata?.name || '';
  }

  get namespace() {
    return this.metadata?.namespace || '';
  }

  get uid() {
    return this.metadata?.uid || '';
  }

  get creationTimestamp() {
    return this.metadata?.creationTimestamp || '';
  }
}

