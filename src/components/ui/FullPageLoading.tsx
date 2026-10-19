import { LoadingBlock } from './LoadingBlock';

export function FullPageLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingBlock />
    </div>
  );
}
