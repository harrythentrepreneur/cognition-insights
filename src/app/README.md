# Frontend App Structure

This document explains the organization of the Next.js app directory and the purpose of each route.

## Main Routes

### Upload Routes
- **`/upload`** - Primary upload page using FileUpload component
- **`/welcome`** - Welcome/onboarding page

### Analysis Pages
- **`/emotional-landscapes`** - Primary emotional analysis dashboard
- **`/relationships-network`** - Social dynamics and relationship analysis
- **`/language-patterns`** - Communication and linguistic analysis  
- **`/personality-analysis`** - Comprehensive personality insights
- **`/growth-journey`** - Personal development and growth tracking

### Utility Routes
- **`/onboarding`** - User onboarding flow
- **`page.tsx`** - Root homepage

## Feature Structure Standard

Each analysis feature follows this consistent structure:

```
feature-name/
├── components/           # Feature-specific components
│   ├── ui/              # UI-only components
│   ├── visualizations/  # Data visualization components
│   └── index.ts         # Component exports
├── hooks/               # Custom React hooks
│   └── index.ts         # Hook exports
├── data/                # Mock data and API functions
├── types.ts             # TypeScript type definitions
├── constants.ts         # Feature constants
├── utils.ts             # Utility functions
└── page.tsx            # Main page component
```

## Shared Resources

### Components (`/src/components/`)
- **`shared/`** - Reusable components across features
- **`onboarding/`** - Onboarding flow components
- Feature-specific components for upload, visualization, etc.

### Utilities (`/src/utils/`)
- **`apiHelpers.ts`** - API communication utilities
- **`sessionUtils.ts`** - Session management utilities

## File Organization Guidelines

1. **Components**: Use TypeScript (.tsx) for all React components
2. **Exports**: Every component directory should have an index.ts file
3. **Types**: Define types in dedicated .ts files, import where needed
4. **Constants**: Keep feature constants in constants.ts files
5. **Data**: Separate mock data from API functions

## Routing Strategy

- Use descriptive route names (no numbers or special characters)
- Keep routes shallow (max 2 levels deep)
- Group related functionality under feature routes
- Maintain consistency across similar features

## Future Optimization Opportunities

1. **Shared Components**: Identify reusable visualizations
2. **Data Fetching**: Centralize API patterns
3. **Type Safety**: Expand TypeScript coverage
4. **Bundle Optimization**: Implement code splitting
5. **Performance**: Add lazy loading for heavy components