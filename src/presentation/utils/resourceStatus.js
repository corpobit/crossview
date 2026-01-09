export const getStatusColor = (conditions, kind) => {
  if (!conditions || conditions.length === 0) return 'gray';
  
  if (kind === 'Provider') {
    const healthyCondition = conditions.find(c => c.type === 'Healthy');
    if (healthyCondition?.status === 'True') return 'green';
    if (healthyCondition?.status === 'False') return 'red';
    return 'yellow';
  }
  
  if (kind === 'CompositeResourceDefinition') {
    const establishedCondition = conditions.find(c => c.type === 'Established');
    const offeredCondition = conditions.find(c => c.type === 'Offered');
    if (establishedCondition && offeredCondition) {
      if (establishedCondition.status === 'True' && offeredCondition.status === 'True') return 'green';
      if (establishedCondition.status === 'False' || offeredCondition.status === 'False') return 'red';
      return 'yellow';
    }
    if (establishedCondition) {
      return establishedCondition.status === 'True' ? 'green' : 'red';
    }
    if (offeredCondition) {
      return offeredCondition.status === 'True' ? 'green' : 'red';
    }
  }
  
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  const readyCondition = conditions.find(c => c.type === 'Ready');
  
  if (syncedCondition && readyCondition) {
    if (syncedCondition.status === 'True' && readyCondition.status === 'True') return 'green';
    if (syncedCondition.status === 'False' || readyCondition.status === 'False') return 'red';
    return 'yellow';
  }
  
  if (syncedCondition) {
    if (syncedCondition.status === 'True') return 'green';
    if (syncedCondition.status === 'False') return 'red';
    return 'yellow';
  }
  
  if (readyCondition) {
    if (readyCondition.status === 'True') return 'green';
    if (readyCondition.status === 'False') return 'red';
    return 'yellow';
  }
  
  const trueCondition = conditions.find(c => c.status === 'True');
  const falseCondition = conditions.find(c => c.status === 'False');
  if (trueCondition) return 'green';
  if (falseCondition) return 'red';
  
  return 'yellow';
};

export const getStatusText = (conditions, kind) => {
  if (!conditions || conditions.length === 0) return 'Unknown';
  
  if (kind === 'Provider') {
    const healthyCondition = conditions.find(c => c.type === 'Healthy');
    if (healthyCondition?.status === 'True') return 'Healthy';
    if (healthyCondition?.status === 'False') return 'Unhealthy';
    const installedCondition = conditions.find(c => c.type === 'Installed');
    if (installedCondition?.status === 'True') return 'Installed';
    return 'Pending';
  }
  
  if (kind === 'CompositeResourceDefinition') {
    const establishedCondition = conditions.find(c => c.type === 'Established');
    const offeredCondition = conditions.find(c => c.type === 'Offered');
    if (establishedCondition && offeredCondition) {
      if (establishedCondition.status === 'True' && offeredCondition.status === 'True') return 'Established & Offered';
      if (establishedCondition.status === 'False') return 'Not Established';
      if (offeredCondition.status === 'False') return 'Not Offered';
      return 'Pending';
    }
    if (establishedCondition) {
      return establishedCondition.status === 'True' ? 'Established' : 'Not Established';
    }
    if (offeredCondition) {
      return offeredCondition.status === 'True' ? 'Offered' : 'Not Offered';
    }
  }
  
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  const readyCondition = conditions.find(c => c.type === 'Ready');
  
  if (syncedCondition && readyCondition) {
    return null;
  }
  
  if (syncedCondition) {
    return syncedCondition.status === 'True' ? 'Synced' : 'Not Synced';
  }
  
  if (readyCondition) {
    return readyCondition.status === 'True' ? 'Ready' : 'Not Ready';
  }
  
  const trueCondition = conditions.find(c => c.status === 'True');
  const falseCondition = conditions.find(c => c.status === 'False');
  if (trueCondition) return 'Active';
  if (falseCondition) return 'Inactive';
  
  return 'Pending';
};

export const getSyncedStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  if (!syncedCondition) return null;
  return {
    text: syncedCondition.status === 'True' ? 'Synced' : 'Not Synced',
    color: syncedCondition.status === 'True' ? 'green' : 'red'
  };
};

export const getReadyStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const readyCondition = conditions.find(c => c.type === 'Ready');
  if (!readyCondition) return null;
  return {
    text: readyCondition.status === 'True' ? 'Ready' : 'Not Ready',
    color: readyCondition.status === 'True' ? 'green' : (readyCondition.status === 'False' ? 'red' : 'yellow')
  };
};

export const getResponsiveStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const responsiveCondition = conditions.find(c => c.type === 'Responsive');
  if (!responsiveCondition) return null;
  return {
    text: responsiveCondition.status === 'True' ? 'Responsive' : 'Not Responsive',
    color: responsiveCondition.status === 'True' ? 'green' : (responsiveCondition.status === 'False' ? 'red' : 'yellow')
  };
};

export const getEstablishedStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const establishedCondition = conditions.find(c => c.type === 'Established');
  if (!establishedCondition) return null;
  return {
    text: establishedCondition.status === 'True' ? 'Established' : 'Not Established',
    color: establishedCondition.status === 'True' ? 'green' : (establishedCondition.status === 'False' ? 'red' : 'yellow')
  };
};

export const getOfferedStatus = (conditions) => {
  if (!conditions || conditions.length === 0) return null;
  const offeredCondition = conditions.find(c => c.type === 'Offered');
  if (!offeredCondition) return null;
  return {
    text: offeredCondition.status === 'True' ? 'Offered' : 'Not Offered',
    color: offeredCondition.status === 'True' ? 'green' : (offeredCondition.status === 'False' ? 'red' : 'yellow')
  };
};

export const getStatusForFilter = (conditions, kind) => {
  if (!conditions || conditions.length === 0) return 'Unknown';
  
  if (kind === 'Provider') {
    const healthyCondition = conditions.find(c => c.type === 'Healthy');
    if (healthyCondition?.status === 'True') return 'Ready';
    if (healthyCondition?.status === 'False') return 'Not Ready';
    const installedCondition = conditions.find(c => c.type === 'Installed');
    if (installedCondition?.status === 'True') return 'Ready';
    return 'Pending';
  }
  
  if (kind === 'CompositeResourceDefinition') {
    const establishedCondition = conditions.find(c => c.type === 'Established');
    const offeredCondition = conditions.find(c => c.type === 'Offered');
    if (establishedCondition && offeredCondition) {
      if (establishedCondition.status === 'True' && offeredCondition.status === 'True') return 'Ready';
      if (establishedCondition.status === 'False' || offeredCondition.status === 'False') return 'Not Ready';
      return 'Pending';
    }
    if (establishedCondition) {
      return establishedCondition.status === 'True' ? 'Ready' : 'Not Ready';
    }
    if (offeredCondition) {
      return offeredCondition.status === 'True' ? 'Ready' : 'Not Ready';
    }
    return 'Pending';
  }
  
  const syncedCondition = conditions.find(c => c.type === 'Synced');
  const readyCondition = conditions.find(c => c.type === 'Ready');
  
  if (syncedCondition && readyCondition) {
    if (syncedCondition.status === 'True' && readyCondition.status === 'True') return 'Ready';
    if (syncedCondition.status === 'False' || readyCondition.status === 'False') return 'Not Ready';
    return 'Pending';
  }
  
  if (syncedCondition) {
    return syncedCondition.status === 'True' ? 'Ready' : 'Not Ready';
  }
  
  if (readyCondition) {
    return readyCondition.status === 'True' ? 'Ready' : 'Not Ready';
  }
  
  const trueCondition = conditions.find(c => c.status === 'True');
  const falseCondition = conditions.find(c => c.status === 'False');
  if (trueCondition) return 'Ready';
  if (falseCondition) return 'Not Ready';
  
  return 'Pending';
};

