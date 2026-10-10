interface ErrorBlockProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-red-50 px-6 py-8">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-destructive/10 px-4 py-2 text-sm font-medium text-red-700 hover:bg-destructive/20 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
