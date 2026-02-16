import { Loader2 } from 'lucide-react';

export default function OrdersLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
    </div>
  );
}
