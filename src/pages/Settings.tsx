import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Settings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">Page en cours de développement...</p>
        </CardContent>
      </Card>
    </div>
  );
}
