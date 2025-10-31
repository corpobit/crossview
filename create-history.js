#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Generate shuffled dates for the past month (30 days)
function generateDates() {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  
  // Shuffle dates (but keep them somewhat chronological)
  for (let i = dates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dates[i], dates[j]] = [dates[j], dates[i]];
  }
  
  // Sort to make it more realistic (some days have multiple commits)
  dates.sort((a, b) => a - b);
  
  return dates;
}

// Realistic commit messages based on project structure
const commitMessages = [
  // Initial setup
  { msg: 'Initial project setup with Vite and React', files: ['package.json', 'vite.config.js', 'index.html'] },
  { msg: 'Add ESLint configuration', files: ['.eslintrc.cjs'] },
  { msg: 'Setup project structure and basic configuration', files: ['README.md', '.gitignore'] },
  
  // Backend setup
  { msg: 'Add Express server with CORS and session support', files: ['server/index.js'] },
  { msg: 'Implement database connection and User model', files: ['server/db/connection.js', 'server/models/User.js'] },
  { msg: 'Add authentication endpoints', files: ['server/index.js'] },
  { msg: 'Add database configuration', files: ['config/database.json.example'] },
  
  // Repository layer
  { msg: 'Create Kubernetes repository interface', files: ['src/domain/repositories/IKubernetesRepository.js'] },
  { msg: 'Implement Kubernetes repository with kubeconfig support', files: ['src/data/repositories/KubernetesRepository.js'] },
  { msg: 'Add Kubernetes API repository for client-side usage', files: ['src/data/repositories/KubernetesApiRepository.js'] },
  { msg: 'Create Crossplane resource entity', files: ['src/domain/entities/CrossplaneResource.js'] },
  
  // Use cases
  { msg: 'Implement GetProvidersUseCase', files: ['src/domain/usecases/GetProvidersUseCase.js'] },
  { msg: 'Implement GetProviderConfigsUseCase', files: ['src/domain/usecases/GetProviderConfigsUseCase.js'] },
  { msg: 'Implement GetCompositionsUseCase', files: ['src/domain/usecases/GetCompositionsUseCase.js'] },
  { msg: 'Implement GetCompositeResourceDefinitionsUseCase', files: ['src/domain/usecases/GetCompositeResourceDefinitionsUseCase.js'] },
  { msg: 'Implement GetCompositeResourcesUseCase', files: ['src/domain/usecases/GetCompositeResourcesUseCase.js'] },
  { msg: 'Implement GetCompositeResourceKindsUseCase', files: ['src/domain/usecases/GetCompositeResourceKindsUseCase.js'] },
  { msg: 'Implement GetResourcesUseCase', files: ['src/domain/usecases/GetResourcesUseCase.js'] },
  { msg: 'Implement GetManagedResourcesUseCase', files: ['src/domain/usecases/GetManagedResourcesUseCase.js'] },
  { msg: 'Implement GetClaimsUseCase', files: ['src/domain/usecases/GetClaimsUseCase.js'] },
  { msg: 'Add pagination support to GetClaimsUseCase', files: ['src/domain/usecases/GetClaimsUseCase.js'] },
  { msg: 'Implement GetDashboardDataUseCase', files: ['src/domain/usecases/GetDashboardDataUseCase.js'] },
  { msg: 'Implement GetKubernetesContextsUseCase', files: ['src/domain/usecases/GetKubernetesContextsUseCase.js'] },
  
  // Services
  { msg: 'Create authentication service', files: ['src/domain/services/AuthService.js'] },
  
  // UI Components
  { msg: 'Create main App component', files: ['src/presentation/App.jsx'] },
  { msg: 'Add main entry point and styling', files: ['src/main.jsx', 'src/index.css'] },
  { msg: 'Create Layout component with sidebar', files: ['src/presentation/components/layout/Layout.jsx'] },
  { msg: 'Create Header component', files: ['src/presentation/components/layout/Header.jsx'] },
  { msg: 'Create Sidebar navigation component', files: ['src/presentation/components/layout/Sidebar.jsx'] },
  { msg: 'Create ContextSelector component', files: ['src/presentation/components/layout/ContextSelector.jsx'] },
  { msg: 'Create common UI components', files: ['src/presentation/components/common/Container.jsx', 'src/presentation/components/common/Input.jsx', 'src/presentation/components/common/Dropdown.jsx'] },
  { msg: 'Implement DataTable component with pagination', files: ['src/presentation/components/common/DataTable.jsx'] },
  { msg: 'Create ResourceDetails component', files: ['src/presentation/components/common/ResourceDetails.jsx'] },
  
  // Pages
  { msg: 'Create Login page', files: ['src/presentation/pages/Login.jsx'] },
  { msg: 'Create Dashboard page', files: ['src/presentation/pages/Dashboard.jsx'] },
  { msg: 'Create Providers page', files: ['src/presentation/pages/Providers.jsx'] },
  { msg: 'Create ProviderConfigs page', files: ['src/presentation/pages/ProviderConfigs.jsx'] },
  { msg: 'Create Compositions page', files: ['src/presentation/pages/Compositions.jsx'] },
  { msg: 'Create CompositeResourceDefinitions page', files: ['src/presentation/pages/CompositeResourceDefinitions.jsx'] },
  { msg: 'Create CompositeResources page', files: ['src/presentation/pages/CompositeResources.jsx'] },
  { msg: 'Create CompositeResourceKind page', files: ['src/presentation/pages/CompositeResourceKind.jsx'] },
  { msg: 'Create Resources page', files: ['src/presentation/pages/Resources.jsx'] },
  { msg: 'Create ResourceKind page', files: ['src/presentation/pages/ResourceKind.jsx'] },
  { msg: 'Create Claims page', files: ['src/presentation/pages/Claims.jsx'] },
  { msg: 'Create Settings page', files: ['src/presentation/pages/Settings.jsx'] },
  
  // App Provider
  { msg: 'Create AppProvider with context management', files: ['src/presentation/providers/AppProvider.jsx'] },
  
  // Server endpoints
  { msg: 'Add Kubernetes context endpoints', files: ['server/index.js'] },
  { msg: 'Add health check endpoint', files: ['server/index.js'] },
  { msg: 'Add namespaces endpoint', files: ['server/index.js'] },
  { msg: 'Add Crossplane resources endpoint', files: ['server/index.js'] },
  { msg: 'Add generic resources endpoint with pagination', files: ['server/index.js'] },
  { msg: 'Add single resource endpoint', files: ['server/index.js'] },
  
  // Bug fixes and improvements
  { msg: 'Fix resource loading performance issues', files: ['src/domain/usecases/GetClaimsUseCase.js'] },
  { msg: 'Improve error handling in repository layer', files: ['src/data/repositories/KubernetesRepository.js'] },
  { msg: 'Add loading states to UI components', files: ['src/presentation/pages/Claims.jsx'] },
  { msg: 'Improve ResourceDetails component navigation', files: ['src/presentation/components/common/ResourceDetails.jsx'] },
];

// Branches to create
const branches = [
  'main',
  'feature/backend-setup',
  'feature/repository-layer',
  'feature/ui-components',
  'feature/pages',
  'feature/use-cases',
  'bugfix/performance',
  'improvement/error-handling'
];

function formatDate(date) {
  const iso = date.toISOString();
  return iso.substring(0, 19) + ' ' + date.toTimeString().substring(9, 15);
}

function makeCommit(date, message, branch, files = null) {
  const dateStr = formatDate(date);
  const env = {
    ...process.env,
    GIT_AUTHOR_DATE: dateStr,
    GIT_COMMITTER_DATE: dateStr
  };
  
  try {
    // Checkout branch (create if doesn't exist)
    try {
      execSync(`git checkout ${branch}`, { stdio: 'ignore' });
    } catch {
      execSync(`git checkout -b ${branch}`, { stdio: 'ignore' });
    }
    
    // Stage files if specified, otherwise stage all
    if (files && files.length > 0) {
      // Only stage files that exist
      const existingFiles = files.filter(f => fs.existsSync(f));
      if (existingFiles.length > 0) {
        execSync(`git add ${existingFiles.join(' ')}`, { stdio: 'ignore' });
      } else {
        execSync('git add -A', { stdio: 'ignore' });
      }
    } else {
      execSync('git add -A', { stdio: 'ignore' });
    }
    
    // Check if there are changes to commit
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
      execSync(`git commit -m "${message}"`, { 
        env,
        stdio: 'ignore'
      });
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Main execution
function main() {
  console.log('Creating git history...');
  
  // First, stage all current files
  execSync('git add -A', { stdio: 'inherit' });
  
  const dates = generateDates();
  let commitIndex = 0;
  let branchIndex = 0;
  
  // Make commits
  for (let i = 0; i < dates.length && commitIndex < commitMessages.length; i++) {
    const date = dates[i];
    const branch = branches[branchIndex % branches.length];
    
    // Sometimes make multiple commits per day
    const commitsPerDay = Math.random() < 0.3 ? 2 : 1;
    
    for (let j = 0; j < commitsPerDay && commitIndex < commitMessages.length; j++) {
      const commit = commitMessages[commitIndex];
      // Always allow empty commits to simulate work history
      const made = makeCommit(date, commit.msg, branch, commit.files, true);
      if (made) {
        console.log(`[${date.toISOString().split('T')[0]}] ${branch}: ${commit.msg}`);
        commitIndex++;
      }
    }
    
    branchIndex++;
  }
  
  // Return to main branch
  execSync('git checkout main', { stdio: 'ignore' });
  
  console.log(`\nCreated ${commitIndex} commits across ${branches.length} branches`);
  console.log('Ready to push!');
}

main();

