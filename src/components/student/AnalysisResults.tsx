
"use client";

import type { AnalyzeStudentProfileOutput } from "@/ai/flows/analyze-student-profile";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Briefcase, BookOpen, BarChartHorizontalBig, ExternalLink, Download, AlertCircle } from "lucide-react"; // Changed Save to Download
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResultsProps {
  result: AnalyzeStudentProfileOutput;
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  const { toast } = useToast();

  const handleDownloadReport = () => {
    if (!result) {
      toast({
        title: "Error",
        description: "No analysis data available to download.",
        variant: "destructive",
      });
      return;
    }
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(result, null, 2) // Pretty print JSON
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "PathFinderAI_CareerAnalysisReport.json";
      link.click();
      toast({
        title: "Report Downloaded",
        description: "Your career analysis report has been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const sanitizeFileName = (name: string) => name.replace(/[^a-z0-9\-]+/gi, "_").slice(0, 100);

  const handleDownloadPathPdf = async (path: any) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const title = `${path.careerPath || path.name || 'Career Path'} - Career Report`;
      doc.setFontSize(16);
      doc.text(title, 14, 20);

      doc.setFontSize(12);
      let y = 30;

      // Required Skills
      const skills: string[] = Array.isArray(path.requiredSkills) ? path.requiredSkills : [];
      doc.text('Required Skills:', 14, y); y += 8;
      if (skills.length === 0 && Array.isArray(path.skillGapReport)) {
        for (const gap of path.skillGapReport) { if (gap?.skill) skills.push(gap.skill); }
      }
      if (skills.length === 0) { doc.text('• N/A', 14, y); y += 8; }
      else {
        for (const s of skills) {
          const lines = doc.splitTextToSize(`• ${s}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; }
          doc.text(lines, 14, y); y += lines.length * 7;
        }
      }

      // Missing Skills
      const missing: string[] = Array.isArray(path.missingSkills) ? path.missingSkills : [];
      if (missing.length > 0) { if (y + 14 > 280) { doc.addPage(); y = 20; } doc.setFontSize(13); doc.text('Missing Skills', 14, y); doc.setFontSize(12); y += 8; }
      for (const m of missing) { const lines = doc.splitTextToSize(`• ${m}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; } doc.text(lines, 14, y); y += lines.length * 7; }

      // Weak Skills
      const weak: string[] = Array.isArray(path.weakSkills) ? path.weakSkills : [];
      if (weak.length === 0 && Array.isArray(path.skillGapReport)) {
        for (const gap of path.skillGapReport) { if ((gap?.yourLevel || '').toLowerCase() === 'beginner' && gap?.skill) weak.push(gap.skill); }
      }
      if (weak.length > 0) { if (y + 14 > 280) { doc.addPage(); y = 20; } doc.setFontSize(13); doc.text('Weak Skills', 14, y); doc.setFontSize(12); y += 8; }
      for (const w of weak) { const lines = doc.splitTextToSize(`• ${w}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; } doc.text(lines, 14, y); y += lines.length * 7; }

      // Recommended Courses (from gap)
      if (Array.isArray(path.skillGapReport) && path.skillGapReport.length) {
        if (y + 14 > 280) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.text('Recommended Courses', 14, y); doc.setFontSize(12); y += 8;
        for (const gap of path.skillGapReport) {
          const header = `• ${gap.skill || 'Skill'} (${gap.yourLevel || 'N/A'})`;
          let lines = doc.splitTextToSize(header, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; }
          doc.text(lines, 14, y); y += lines.length * 7;
          if (Array.isArray(gap.recommendedCourses)) {
            for (const c of gap.recommendedCourses) {
              const cLine = `   - ${c?.title || 'Course'}: ${c?.link || ''}`;
              lines = doc.splitTextToSize(cLine, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; }
              doc.text(lines, 14, y); y += lines.length * 7;
            }
          }
        }
      }

      // Project Suggestions
      if (Array.isArray(path.projectSuggestions) && path.projectSuggestions.length) {
        if (y + 14 > 280) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.text('Project Suggestions', 14, y); doc.setFontSize(12); y += 8;
        for (const p of path.projectSuggestions) {
          let lines = doc.splitTextToSize(`• ${p.title || 'Project'}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; }
          doc.text(lines, 14, y); y += lines.length * 7;
          if (p.description) { lines = doc.splitTextToSize(`   ${p.description}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; } doc.text(lines, 14, y); y += lines.length * 7; }
          if (p.link) { lines = doc.splitTextToSize(`   Link: ${p.link}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; } doc.text(lines, 14, y); y += lines.length * 7; }
        }
      }

      // Roadmap
      if (Array.isArray(path.roadmap) && path.roadmap.length) {
        if (y + 14 > 280) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.text('Roadmap', 14, y); doc.setFontSize(12); y += 8;
        for (const r of path.roadmap) {
          let lines = doc.splitTextToSize(`• ${r.title || 'Milestone'}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; }
          doc.text(lines, 14, y); y += lines.length * 7;
          if (Array.isArray(r.steps)) {
            for (const s of r.steps) { lines = doc.splitTextToSize(`   - ${s}`, 180); if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; } doc.text(lines, 14, y); y += lines.length * 7; }
          }
        }
      }

      const fileName = `PathFinderAI_${sanitizeFileName(path.careerPath || path.name || 'Career_Path')}_Report.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF downloaded', description: 'Career report PDF has been saved.' });
    } catch (e) {
      console.error('Failed to generate PDF', e);
      toast({ title: 'PDF generation failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  if (!result || !result.suggestedCareerPaths || result.suggestedCareerPaths.length === 0) {
    return (
      <Card className="shadow-lg border-yellow-500 bg-yellow-50">
        <CardHeader className="flex flex-row items-center gap-3">
          <AlertCircle className="h-8 w-8 text-yellow-600" />
          <CardTitle className="font-headline text-yellow-700 text-2xl">No Suggestions Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700">
            We couldn&apos;t generate career suggestions based on the provided profile. 
            Please try refining your academic details, interests or resume.
          </p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-8">
      {result.resumeInsights && (Array.isArray((result as any).resumeInsights?.pros) || Array.isArray((result as any).resumeInsights?.cons)) && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
              <BookOpen className="h-7 w-7" /> Resume Insights
            </CardTitle>
            <CardDescription>Strengths and areas to improve from your resume.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-green-600">Pros</h4>
              {(Array.isArray((result as any).resumeInsights?.pros) ? (result as any).resumeInsights.pros : []).length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {(result as any).resumeInsights.pros.map((p: string, i: number) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No pros listed.</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-red-600">Cons</h4>
              {(Array.isArray((result as any).resumeInsights?.cons) ? (result as any).resumeInsights.cons : []).length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {(result as any).resumeInsights.cons.map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No cons listed.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
            <Briefcase className="h-7 w-7" /> Suggested Career Paths
          </CardTitle>
          <CardDescription>Based on your profile, here are some career paths you might excel in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Array.isArray(result.suggestedCareerPaths) ? result.suggestedCareerPaths : []).map((path: any, index: number) => (
            <Card key={index} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-background">
              <CardHeader className="bg-secondary/50 p-4">
                <CardTitle className="font-headline text-xl text-secondary-foreground">{path.careerPath || path.name || `Career Path ${index + 1}`}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadPathPdf(path)} className="border-primary text-primary hover:bg-primary/10">
                    <Download className="mr-2 h-4 w-4" /> Download Required Skills (PDF)
                  </Button>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1 text-primary">Core Required Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const rs = Array.isArray(path.requiredSkills) ? path.requiredSkills : [];
                      const alt = Array.isArray(path.skills) ? path.skills : [];
                      const normalized: string[] = rs.length > 0 ? rs : alt.map((s: any) => typeof s === 'string' ? s : (s?.name || s?.skill)).filter(Boolean);
                      return normalized.map((skill: string, skillIndex: number) => (
                        <Badge key={skillIndex} variant="secondary" className="text-xs">{skill}</Badge>
                      ));
                    })()}
                  </div>
                </div>

                {Array.isArray(path.missingSkills) && path.missingSkills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-primary">Missing Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                      {path.missingSkills.map((s: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(path.weakSkills) && path.weakSkills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-primary">Weak Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                      {path.weakSkills.map((s: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(path.projectSuggestions) && path.projectSuggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-primary">Project Suggestions:</h4>
                    <ul className="space-y-2">
                      {path.projectSuggestions.map((p: any, i: number) => (
                        <li key={i} className="text-sm">
                          <div className="font-medium">{p.title || 'Project'}</div>
                          {p.description && <div className="text-muted-foreground text-xs">{p.description}</div>}
                          {p.link && (
                            <Link href={p.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs inline-flex items-center">
                              View <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(path.roadmap) && path.roadmap.length > 0 && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={`roadmap-${index}`}>
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline text-accent hover:text-accent/80">
                        <BookOpen className="mr-2 h-4 w-4" /> View Roadmap
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <ul className="space-y-3">
                          {path.roadmap.map((r: any, ri: number) => (
                            <li key={ri}>
                              <div className="font-medium text-sm">{r.title || `Milestone ${ri+1}`}</div>
                              {Array.isArray(r.steps) && r.steps.length > 0 && (
                                <ul className="list-disc pl-5 text-xs space-y-1 mt-1">
                                  {r.steps.map((s: string, si: number) => (
                                    <li key={si}>{s}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {Array.isArray(path.skillGapReport) && path.skillGapReport.length > 0 && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value={`item-${index}`}>
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline text-accent hover:text-accent/80">
                        <BarChartHorizontalBig className="mr-2 h-4 w-4" /> View Skill Gap Report & Recommendations
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold">Skill</TableHead>
                              <TableHead className="font-semibold">Your Level</TableHead>
                              <TableHead className="font-semibold">Recommended Courses</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {path.skillGapReport.map((gap: any, gapIndex: number) => (
                              <TableRow key={gapIndex}>
                                <TableCell className="font-medium text-sm">{gap.skill || gap.name || 'Skill'}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      (gap.yourLevel || '').toLowerCase() === 'beginner' ? 'destructive' : 
                                      (gap.yourLevel || '').toLowerCase() === 'intermediate' ? 'outline' : 
                                      'default'
                                    } 
                                    className="text-xs capitalize"
                                  >
                                    {gap.yourLevel || gap.level || 'N/A'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {Array.isArray(gap.recommendedCourses) && gap.recommendedCourses.length > 0 ? (
                                    <ul className="space-y-1">
                                      {gap.recommendedCourses.map((course: any, courseIndex: number) => (
                                        <li key={courseIndex} className="text-xs">
                                          <Link href={course.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center" title={course.link}>
                                            {(course.title || '').length > 50 ? `${(course.title || '').substring(0,50)}...` : (course.title || course.link || 'Course')}
                                            <ExternalLink className="ml-1 h-3 w-3 shrink-0" />
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
        <CardFooter>
          <Button onClick={handleDownloadReport} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <Download className="mr-2 h-4 w-4" /> Download Full Report (JSON)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
