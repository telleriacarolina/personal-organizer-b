import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  CalendarBlank,
  Clock, 
  Briefcase,
  ArrowRight,
  Check
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export type WorkOrganizationType = 
  | 'date'
  | 'week'
  | 'month'
  | 'time-of-day'
  | 'job-based';

export interface WorkOrganizationPreference {
  type: WorkOrganizationType;
  startTime?: string;
}

interface WorkOrganizationQuestionnaireProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (preference: WorkOrganizationPreference) => void;
}

export function WorkOrganizationQuestionnaire({
  open,
  onOpenChange,
  onComplete
}: WorkOrganizationQuestionnaireProps) {
  const [selectedType, setSelectedType] = useState<WorkOrganizationType>('date');
  const [startTime, setStartTime] = useState('06:00');

  const handleComplete = () => {
    onComplete({
      type: selectedType,
      ...(selectedType === 'time-of-day' && { startTime })
    });
    onOpenChange(false);
  };

  const organizationOptions = [
    {
      value: 'date' as WorkOrganizationType,
      title: 'By Date',
      description: 'Organize work items by specific calendar dates',
      icon: <Calendar size={32} weight="duotone" className="text-primary" />,
      example: 'Show all tasks, clients, and jobs for each day',
      bestFor: 'Day-to-day planning and appointments'
    },
    {
      value: 'week' as WorkOrganizationType,
      title: 'By Week',
      description: 'Group work by week for broader planning',
      icon: <CalendarBlank size={32} weight="duotone" className="text-primary" />,
      example: 'View your entire week at a glance',
      bestFor: 'Weekly planning and recurring schedules'
    },
    {
      value: 'month' as WorkOrganizationType,
      title: 'By Month',
      description: 'Monthly overview of all work commitments',
      icon: <CalendarBlank size={32} weight="duotone" className="text-primary" />,
      example: 'See monthly patterns and long-term planning',
      bestFor: 'Long-term project management'
    },
    {
      value: 'time-of-day' as WorkOrganizationType,
      title: 'By Time of Day',
      description: 'Schedule-based organization starting from a specific time',
      icon: <Clock size={32} weight="duotone" className="text-primary" />,
      example: 'Daily schedule from 6 AM onwards',
      bestFor: 'Hourly scheduling and time blocking'
    },
    {
      value: 'job-based' as WorkOrganizationType,
      title: 'By Job/Project',
      description: 'Organize by different jobs or clients',
      icon: <Briefcase size={32} weight="duotone" className="text-primary" />,
      example: 'Group tasks: Job 1 (9am-12pm), Job 2 (1pm-5pm)',
      bestFor: 'Multiple projects or client-based work'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Briefcase size={28} weight="duotone" className="text-primary" />
            How would you like to organize your work?
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose the organization style that best fits your workflow. You can change this later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={selectedType} onValueChange={(value) => setSelectedType(value as WorkOrganizationType)}>
            <div className="grid gap-4">
              {organizationOptions.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer"
                  >
                    <Card
                      className={`p-5 transition-all duration-200 hover:shadow-md ${
                        selectedType === option.value
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {option.icon}
                            <div>
                              <h3 className="font-semibold text-lg">{option.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {option.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 space-y-2 ml-11">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Example:</span>
                              <p className="text-xs text-muted-foreground italic flex-1">
                                {option.example}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {option.bestFor}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {selectedType === option.value && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground"
                            >
                              <Check size={18} weight="bold" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </Label>
                </motion.div>
              ))}
            </div>
          </RadioGroup>

          <AnimatePresence>
            {selectedType === 'time-of-day' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 bg-accent/20">
                  <Label htmlFor="start-time" className="text-sm font-medium mb-2 block">
                    What time does your workday typically start?
                  </Label>
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-primary" />
                    <input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">
                      Your schedule will start from this time
                    </span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              className="flex-1 gap-2"
            >
              Continue
              <ArrowRight size={18} weight="bold" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
