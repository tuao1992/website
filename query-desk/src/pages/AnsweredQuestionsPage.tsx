import { useQuestions } from '../hooks/useQuestions'
import { QuestionList } from '../components/questions/QuestionList'
import { RefreshButton } from '../components/common/RefreshButton'

export function AnsweredQuestionsPage() {
  const { questions, loading, error, refresh, refreshing } = useQuestions('answered')

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-sm font-semibold text-gray-700">
          Answered questions {!loading && `(${questions.length})`}
        </h2>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} />
      </div>
      <QuestionList
        questions={questions}
        loading={loading}
        error={error}
        onRetry={refresh}
        emptyMessage="No answered questions yet."
      />
    </div>
  )
}
