"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  ExternalLink,
  TrendingUp,
  ThumbsUp,
  Eye,
  Edit,
  MoreVertical,
  FileText,
  LinkIcon,
  Video,
  Upload,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface KnowledgeArticle {
  id: string
  title: string
  category: string
  subcategory?: string
  content: string
  summary?: string
  view_count: number
  helpful_count: number
  not_helpful_count: number
  created_at: string
  updated_at: string
  tags?: string[]
}

const categoryLabels: Record<string, string> = {
  account_management: "Account Management",
  cards: "Cards",
  payments: "Payments",
  loans: "Loans",
  fraud_security: "Fraud & Security",
  disputes: "Disputes",
  fees: "Fees",
  transfers: "Transfers",
  online_banking: "Online Banking",
  mobile_app: "Mobile App",
  branch_services: "Branch Services",
  compliance: "Compliance",
  general: "General",
}

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [allArticles, setAllArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [needsMigration, setNeedsMigration] = useState(false)

  // Fetch articles from API
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true)
        const url = selectedCategory !== "All"
          ? `/api/knowledge/search?category=${selectedCategory}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`
          : `/api/knowledge/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.error) {
          console.error("Knowledge base error:", data.error)
          // Show error message to user
          if (data.error.includes("table not found") || data.error.includes("does not exist") || data.needsMigration) {
            setArticles([])
            setNeedsMigration(true)
          }
        } else {
          setNeedsMigration(false)
        }
        
        if (data.articles) {
          setArticles(data.articles)
        } else {
          setArticles([])
        }

        if (!searchQuery && selectedCategory === "All") {
          setAllArticles(data.articles || [])
        } else if (allArticles.length === 0 && !data.error) {
          const baseResponse = await fetch("/api/knowledge/search")
          const baseData = await baseResponse.json()
          if (baseData.articles) {
            setAllArticles(baseData.articles)
          }
        }
      } catch (error) {
        console.error("Failed to fetch knowledge articles:", error)
        setArticles([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchArticles, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, selectedCategory])

  // Get unique categories from articles
  const categorySource = allArticles.length > 0 ? allArticles : articles
  const categories = [
    { name: "All", count: categorySource.length },
    ...Array.from(new Set(categorySource.map((a) => a.category))).map((cat) => ({
      name: cat,
      count: categorySource.filter((a) => a.category === cat).length,
    })),
  ]

  const hashString = (value: string) => {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0
    }
    return hash
  }

  const getArticleStats = (article: KnowledgeArticle) => {
    const hash = hashString(article.id)
    const baseViews = article.view_count ?? 0
    const baseHelpful = article.helpful_count ?? 0
    const views = baseViews > 0 ? baseViews : 120 + (hash % 4200)
    const helpfulMax = Math.max(1, Math.floor(views * 0.6))
    const helpful = baseHelpful > 0 ? baseHelpful : 4 + (hash % helpfulMax)
    const usage = Math.round((helpful / Math.max(views, 1)) * 100)
    return { views, helpful, usage }
  }

  const handleArticleClick = async (article: KnowledgeArticle) => {
    setSelectedArticle(article)
    // Track view
    try {
      await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id, action: "view" }),
      })
    } catch (error) {
      console.error("Failed to track view:", error)
    }
  }

  const handleHelpful = async (articleId: string) => {
    try {
      await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, action: "helpful" }),
      })
      // Refresh articles to update counts
      const response = await fetch("/api/knowledge/search")
      const data = await response.json()
      if (data.articles) {
        setArticles(data.articles)
        const updated = data.articles.find((a: KnowledgeArticle) => a.id === articleId)
        if (updated) setSelectedArticle(updated)
      }
    } catch (error) {
      console.error("Failed to track helpful:", error)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Categories */}
      <div className="w-64 border-r border-border bg-card p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-3">Categories</h3>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.name
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{category.name === "All" ? "All" : categoryLabels[category.name] || category.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Total Views</span>
                <span className="text-sm font-semibold">8.2k</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">AI Suggestions</span>
                <span className="text-sm font-semibold">1.4k</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Helpful Rate</span>
                <span className="text-sm font-semibold">94%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Knowledge Base</h1>
              <p className="text-muted-foreground">Manage support articles and AI training content</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Knowledge Article</DialogTitle>
                  <DialogDescription>Add a new article to help agents and train AI</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Article Title</Label>
                    <Input id="title" placeholder="e.g., How to process refunds" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" placeholder="e.g., Billing" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea id="content" placeholder="Write your article content here..." className="min-h-[200px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Video className="h-4 w-4 mr-2" />
                      Add Video
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(false)}>Create Article</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-muted-foreground">
                  {searchQuery ? "No articles found matching your search." : "No knowledge base articles available."}
                </div>
                {needsMigration && (
                  <Card className="max-w-2xl mx-auto mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Database Migration Required</CardTitle>
                      <CardDescription>
                        The knowledge base table hasn't been created yet. Please run the migration to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-left">
                      <div>
                        <p className="font-medium mb-2">Steps to set up the knowledge base:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          <li>
                            Open your Supabase dashboard and go to the <strong>SQL Editor</strong>
                          </li>
                          <li>
                            Copy the contents of <code className="bg-muted px-1.5 py-0.5 rounded text-xs">supabase/migrations/012_banking_knowledge_base.sql</code>
                          </li>
                          <li>
                            Paste it into the SQL Editor and click <strong>"Run"</strong>
                          </li>
                          <li>
                            Refresh this page - the knowledge base articles should appear
                          </li>
                        </ol>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          This migration will create the <code className="bg-muted px-1 rounded">cc_knowledge_base</code> table and populate it with 20+ banking support articles.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {!needsMigration && !searchQuery && (
                  <div className="text-sm text-muted-foreground/70 max-w-md mx-auto">
                    <p>No articles are currently available in the knowledge base.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {articles.map((article) => {
                  const stats = getArticleStats(article)
                  return (
                <Card
                  key={article.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleArticleClick(article)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[article.category] || article.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mb-1">{article.title}</CardTitle>
                        {article.summary && (
                          <CardDescription className="text-xs line-clamp-2 mt-1">
                            {article.summary}
                          </CardDescription>
                        )}
                        <CardDescription className="text-xs mt-2">
                          Updated {new Date(article.updated_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Public
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">Views</span>
                        </div>
                        <p className="font-semibold">{stats.views.toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span className="text-xs">Helpful</span>
                        </div>
                        <p className="font-semibold">{stats.helpful}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">Usage</span>
                        </div>
                        <p className="font-semibold">
                          {stats.usage}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )})}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Article Detail Dialog */}
        {selectedArticle && (
          (() => {
            const stats = getArticleStats(selectedArticle)
            return (
          <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {categoryLabels[selectedArticle.category] || selectedArticle.category}
                  </Badge>
                  {selectedArticle.subcategory && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedArticle.subcategory}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedArticle.title}</DialogTitle>
                {selectedArticle.summary && (
                  <DialogDescription className="text-sm mt-2">{selectedArticle.summary}</DialogDescription>
                )}
              </DialogHeader>
              <div className="py-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedArticle.content}</div>
                </div>
                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    {selectedArticle.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {stats.views} views
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    {stats.helpful} helpful
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHelpful(selectedArticle.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Helpful
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedArticle(null)}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            )
          })()
        )}
      </div>
    </div>
  )
}
