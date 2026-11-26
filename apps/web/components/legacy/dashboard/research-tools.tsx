"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Folder,
  Search,
  RefreshCw,
  AlertCircle,
  Cpu,
} from "lucide-react";

import { fetchMcpToolsApi, type McpToolItem } from "@/lib/api/legacy/mcp-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ResearchTools() {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<"all" | "notes" | "folders">("all");

  const {
    data: tools = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["mcp-tools"],
    queryFn: fetchMcpToolsApi,
  });

  const filteredTools = tools.filter((tool: McpToolItem) => {
    const matchesCategory =
      selectedCategory === "all" || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const notesCount = tools.filter((t: McpToolItem) => t.category === "notes").length;
  const foldersCount = tools.filter((t: McpToolItem) => t.category === "folders").length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-heading">Exposed MCP Tools Directory</CardTitle>
            <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
              Live API ({tools.length})
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified tool definitions fetched directly from the backend MCP server runtime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh tools from API"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-muted/20 self-start">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({tools.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("notes")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedCategory === "notes"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3 text-primary" />
              <span>Notes ({notesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("folders")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedCategory === "folders"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Folder className="size-3 text-primary" />
              <span>Folders ({foldersCount})</span>
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search tool names or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        {/* Content State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-xs text-muted-foreground">
            <Spinner />
            <span>Discovering exposed tools from MCP runtime...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-xs font-medium text-destructive">
                {error instanceof Error ? error.message : "Failed to load tools from MCP API"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ensure the backend server is running and accessible at configured API URL.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="size-3" />
              <span>Retry</span>
            </Button>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
            <Cpu className="size-6 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">No matching tools found</p>
            <p className="text-[11px]">Try adjusting your search query or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTools.map((tool) => {
              const Icon = tool.category === "folders" ? Folder : FileText;

              return (
                <div
                  key={tool.name}
                  className="flex flex-col justify-between rounded-lg border border-border/60 bg-surface/60 p-4 space-y-3 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-background capitalize">
                        {tool.category}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-mono text-xs font-semibold text-foreground">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Parameters ({tool.parameters.length}):</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {tool.parameters.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">None required</span>
                      ) : (
                        tool.parameters.map((p) => (
                          <Badge
                            key={p.name}
                            variant="secondary"
                            className="text-[9px] font-mono px-1.5 py-0"
                            title={`${p.name} (${p.type})${p.required ? " - Required" : " - Optional"}: ${p.description}`}
                          >
                            <span>{p.name}</span>
                            {p.required && <span className="text-destructive font-bold ml-0.5">*</span>}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
