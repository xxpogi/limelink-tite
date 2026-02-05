import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Alerts</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Alert Config
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No alert configurations yet</p>
            <Button>Create your first alert</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
