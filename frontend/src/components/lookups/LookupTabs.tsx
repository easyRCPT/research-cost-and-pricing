import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LookupTables } from '@/types'
import { AttributesTab } from './AttributesTab'
import { ConstantsTab } from './ConstantsTab'
import { DeliverablesTab } from './DeliverablesTab'
import { EbaTab } from './EbaTab'
import { ExpensesTab } from './ExpensesTab'
import { OnCostsTab } from './OnCostsTab'
import { OrgUnitsTab } from './OrgUnitsTab'
import { SalaryRatesTab } from './SalaryRatesTab'

interface LookupTabsProps {
  data: LookupTables
}

export function LookupTabs({ data }: LookupTabsProps) {
  return (
    <Tabs defaultValue="constants">
      <TabsList className="mb-5">
        <TabsTrigger value="constants">Constants</TabsTrigger>
        <TabsTrigger value="rates">Salary Rates</TabsTrigger>
        <TabsTrigger value="eba">EBA Increases</TabsTrigger>
        <TabsTrigger value="oncosts">On-costs</TabsTrigger>
        <TabsTrigger value="orgunits">Org Units</TabsTrigger>
        <TabsTrigger value="expenses">Non-Staff Expenses</TabsTrigger>
        <TabsTrigger value="attributes">Activities &amp; Regions</TabsTrigger>
        <TabsTrigger value="deliverables">
          Deliverables &amp; Revenue
        </TabsTrigger>
      </TabsList>

      <TabsContent value="constants">
        <ConstantsTab data={data} />
      </TabsContent>
      <TabsContent value="rates">
        <SalaryRatesTab
          salaryRates={data.salary_rates}
          multipliers={data.salary_rate_multipliers}
        />
      </TabsContent>
      <TabsContent value="eba">
        <EbaTab
          increases={data.eba_increases}
          incrementCaps={data.increment_caps}
        />
      </TabsContent>
      <TabsContent value="oncosts">
        <OnCostsTab rates={data.on_cost_rates} />
      </TabsContent>
      <TabsContent value="orgunits">
        <OrgUnitsTab departments={data.departments} />
      </TabsContent>
      <TabsContent value="expenses">
        <ExpensesTab categories={data.non_staff_cost_categories} />
      </TabsContent>
      <TabsContent value="attributes">
        <AttributesTab activities={data.activities} regions={data.regions} />
      </TabsContent>
      <TabsContent value="deliverables">
        <DeliverablesTab
          deliverableTypes={data.deliverable_types}
          revenueCategories={data.revenue_categories}
        />
      </TabsContent>
    </Tabs>
  )
}
