import { useQuestions } from '../hooks/useQuestions'
import { AskQuestionForm } from '../components/questions/AskQuestionForm'
import { QuestionList } from '../components/questions/QuestionList'
import { RefreshButton } from '../components/common/RefreshButton'

export function OpenQuestionsPage() {
  const { questions, loading, error, refresh, refreshing } = useQuestions('open')

  return (
    <div className="flex flex-1 flex-col">
      <AskQuestionForm />
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Open questions {!loading && `(${questions.length})`}
        </h2>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} />
      </div>
      <QuestionList
        questions={questions}
        loading={loading}
        error={error}
        onRetry={refresh}
        emptyMessage="No open questions right now."
      />
    </div>
  )
}
