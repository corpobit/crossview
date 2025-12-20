export class GetFunctionsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const apiVersion = 'pkg.crossplane.io/v1';
      const kind = 'Function';
      const functionsResult = await this.kubernetesRepository.getResources(apiVersion, kind, null, context);
      const functions = functionsResult.items || functionsResult;
      const functionsArray = Array.isArray(functions) ? functions : [];
      
      const compositionsResult = await this.kubernetesRepository.getResources('apiextensions.crossplane.io/v1', 'Composition', null, context);
      const compositions = compositionsResult.items || compositionsResult;
      const compositionsArray = Array.isArray(compositions) ? compositions : [];
      
      const functionUsageMap = new Map();
      compositionsArray.forEach(comp => {
        if (comp.spec?.pipeline) {
          comp.spec.pipeline.forEach(step => {
            if (step.functionRef?.name) {
              const funcName = step.functionRef.name;
              if (!functionUsageMap.has(funcName)) {
                functionUsageMap.set(funcName, []);
              }
              functionUsageMap.get(funcName).push({
                name: comp.metadata?.name,
                namespace: comp.metadata?.namespace || null,
              });
            }
          });
        }
        if (comp.spec?.functions) {
          comp.spec.functions.forEach(func => {
            if (func.functionRef?.name) {
              const funcName = func.functionRef.name;
              if (!functionUsageMap.has(funcName)) {
                functionUsageMap.set(funcName, []);
              }
              functionUsageMap.get(funcName).push({
                name: comp.metadata?.name,
                namespace: comp.metadata?.namespace || null,
              });
            }
          });
        }
      });
      
      return functionsArray.map(func => {
        const conditions = func.status?.conditions || [];
        const installed = conditions.some(c => c.type === 'Installed' && c.status === 'True');
        const healthy = conditions.some(c => c.type === 'Healthy' && c.status === 'True');
        const funcName = func.metadata?.name || 'unknown';
        const usedIn = functionUsageMap.get(funcName) || [];
        
        return {
          name: funcName,
          namespace: func.metadata?.namespace || null,
          uid: func.metadata?.uid || '',
          creationTimestamp: func.metadata?.creationTimestamp || '',
          version: func.spec?.package || '',
          package: func.spec?.package || '',
          controllerConfigRef: func.spec?.controllerConfigRef?.name || null,
          revision: func.status?.currentRevision || '',
          installed: installed,
          healthy: healthy,
          conditions: conditions,
          status: func.status || {},
          spec: func.spec || {},
          usedInCompositions: usedIn,
          usedInCount: usedIn.length,
        };
      });
    } catch (error) {
      throw new Error(`Failed to get functions: ${error.message}`);
    }
  }
}

