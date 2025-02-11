import { CardThemed } from '@genshin-optimizer/common/ui'
import { colorToRgbaString, hexToColor } from '@genshin-optimizer/common/util'
import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import { charKeyToLocGenderedCharKey } from '@genshin-optimizer/gi/consts'
import type { GeneratedBuild, LoadoutDatum } from '@genshin-optimizer/gi/db'
import type { CharacterContextObj } from '@genshin-optimizer/gi/db-ui'
import {
  CharacterContext,
  TeamCharacterContext,
  useCharacter,
  useDBMeta,
  useDatabase,
  useTeam,
  useTeamChar,
  type TeamCharacterContextObj,
} from '@genshin-optimizer/gi/db-ui'
import { getCharEle } from '@genshin-optimizer/gi/stats'
import {
  DataContext,
  FormulaDataWrapper,
  GraphContext,
  useTeamDataNoContext,
  useTitle,
  type ChartData,
  type GraphContextObj,
  type dataContextObj,
} from '@genshin-optimizer/gi/ui'
import { SillyContext } from '@genshin-optimizer/gi/uidata'
import { Box, CardContent, Skeleton } from '@mui/material'
import { Suspense, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes, useMatch, useParams } from 'react-router-dom'
import Content from './CharacterDisplay/Content'
import TeamCharacterSelector from './TeamCharacterSelector'
import TeamSetting from './TeamSetting'

export default function PageTeam() {
  const database = useDatabase()
  const { teamId } = useParams<{ teamId?: string }>()
  const invalidKey = !teamId || !database.teams.keys.includes(teamId)

  // An edit is triggered whenever a team gets opened even if no edits are done
  useEffect(() => {
    if (invalidKey) return
    database.teams.set(teamId, { lastEdit: Date.now() })
  }, [teamId, database.teams, invalidKey])

  if (invalidKey) return <Navigate to="/teams" />

  return (
    <Box my={1} display="flex" flexDirection="column" gap={1}>
      <Suspense
        fallback={<Skeleton variant="rectangular" width="100%" height={1000} />}
      >
        {teamId && <PageLoadoutWrapper teamId={teamId} />}
      </Suspense>
    </Box>
  )
}
function PageLoadoutWrapper({ teamId }: { teamId: string }) {
  const database = useDatabase()
  const team = useTeam(teamId)!
  const { loadoutData } = team
  // use the current URL as the "source of truth" for characterKey and tab.
  const {
    params: { characterKey: characterKeyRaw },
  } = useMatch({ path: '/teams/:teamId/:characterKey', end: false }) ?? {
    params: {},
  }
  const {
    params: { tab: tabRaw },
  } = useMatch({ path: '/teams/:teamId/:characterKey/:tab' }) ?? {
    params: {},
  }
  const tab = tabRaw ?? 'overview'

  // validate characterKey
  const loadoutDatum = useMemo(() => {
    const loadoutDatum = loadoutData.find(
      (loadoutDatum) =>
        loadoutDatum?.teamCharId &&
        database.teamChars.get(loadoutDatum.teamCharId)?.key === characterKeyRaw
    )

    return loadoutDatum
  }, [loadoutData, database.teamChars, characterKeyRaw])

  // make sure the characterKey path is valid
  if ((characterKeyRaw && !loadoutDatum) || (loadoutData[0] && !loadoutDatum)) {
    const ld = loadoutData[0]
    const ck = ld && database.teamChars.get(ld.teamCharId)?.key
    if (ck) return <Navigate to={ck} replace />
    else return <Navigate to="" replace />
  }
  return <Page loadoutDatum={loadoutDatum} teamId={teamId} tab={tab} />
}

const fallback = <Skeleton variant="rectangular" width="100%" height={1000} />
// Stored per teamCharId
const chartDataAll: Record<string, ChartData> = {}
const graphBuildAll: Record<string, GeneratedBuild[]> = {}

function Page({
  teamId,
  tab,
  loadoutDatum,
}: {
  teamId: string
  tab: string
  loadoutDatum?: LoadoutDatum
}) {
  const { silly } = useContext(SillyContext)
  const database = useDatabase()
  const { gender } = useDBMeta()

  const team = useTeam(teamId)!

  const teamCharId = loadoutDatum?.teamCharId
  const characterKey = database.teamChars.get(teamCharId)?.key

  const teamChar = useTeamChar(teamCharId ?? '')

  const { t } = useTranslation([
    'sillyWisher_charNames',
    'charNames_gen',
    'page_character',
  ])

  useTitle(
    useMemo(
      () =>
        `${team.name} - ${t(
          `${silly ? 'sillyWisher_charNames' : 'charNames_gen'}:${
            characterKey
              ? charKeyToLocGenderedCharKey(characterKey, gender)
              : 'Character'
          }`
        )} - ${t(`page_character:tabs.${tab}`)}`,
      [t, team.name, silly, characterKey, gender, tab]
    )
  )

  const teamCharacterContextValue: TeamCharacterContextObj | undefined =
    useMemo(() => {
      if (!teamCharId || !teamChar || !loadoutDatum) return undefined
      return {
        teamId,
        team,
        teamCharId,
        teamChar,
        loadoutDatum,
      }
    }, [teamId, team, teamCharId, teamChar, loadoutDatum])

  const teamData = useTeamDataNoContext(teamId, teamCharId ?? '')
  const { target: charUIData } =
    (characterKey && teamData?.[characterKey]) ?? {}

  const dataContextValue: dataContextObj | undefined = useMemo(() => {
    if (!teamData || !charUIData) return undefined
    return {
      data: charUIData,
      teamData,
      compareData: undefined,
    }
  }, [charUIData, teamData])

  return (
    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TeamSetting
          teamId={teamId}
          teamData={teamData}
          buttonProps={{
            sx: {
              flexGrow: 1,
              backgroundColor: 'contentLight.main',
            },
            variant: 'outlined',
            color: 'info',
          }}
        />
      </Box>
      <CardThemed>
        <Box
          sx={(theme) => {
            const elementKey = characterKey && getCharEle(characterKey)
            if (!elementKey) return {}
            const hex = theme.palette[elementKey].main as string
            const color = hexToColor(hex)
            if (!color) return {}
            const rgba = colorToRgbaString(color, 0.1)
            return {
              background: `linear-gradient(to bottom, ${rgba} 0%, rgba(0,0,0,0)) 25%`,
            }
          }}
        >
          <TeamCharacterSelector
            teamId={teamId}
            characterKey={characterKey}
            tab={tab}
          />
          <CardContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            {teamCharacterContextValue ? (
              dataContextValue ? (
                <TeamCharacterContext.Provider
                  value={teamCharacterContextValue}
                >
                  <DataContext.Provider value={dataContextValue}>
                    <InnerContent tab={tab} />
                  </DataContext.Provider>
                </TeamCharacterContext.Provider>
              ) : (
                fallback
              )
            ) : null}
          </CardContent>
        </Box>
      </CardThemed>
    </Box>
  )
}
function InnerContent({ tab }: { tab: string }) {
  const {
    teamCharId,
    teamChar: { key: characterKey },
  } = useContext(TeamCharacterContext)
  const character = useCharacter(characterKey as CharacterKey)
  const CharacterContextValue: CharacterContextObj | undefined = useMemo(
    () =>
      character && {
        character,
      },
    [character]
  )

  const [chartData, setChartDataState] = useState<ChartData | undefined>(
    chartDataAll[teamCharId]
  )
  const [graphBuilds, setGraphBuildState] = useState<
    GeneratedBuild[] | undefined
  >(graphBuildAll[teamCharId])
  useEffect(() => {
    setChartDataState(chartDataAll[teamCharId])
    setGraphBuildState(graphBuildAll[teamCharId])
  }, [teamCharId, setChartDataState, setGraphBuildState])

  const graphContextValue: GraphContextObj | undefined = useMemo(() => {
    return {
      chartData,
      setChartData: (data) => {
        if (data) chartDataAll[teamCharId] = data
        setChartDataState(data)
      },
      graphBuilds,
      setGraphBuilds: (data) => {
        if (data) graphBuildAll[teamCharId] = data
        setGraphBuildState(data)
      },
    }
  }, [
    teamCharId,
    chartData,
    graphBuilds,
    setChartDataState,
    setGraphBuildState,
  ])
  if (!CharacterContextValue) return fallback
  return (
    <CharacterContext.Provider value={CharacterContextValue}>
      <GraphContext.Provider value={graphContextValue}>
        <FormulaDataWrapper>
          <Routes>
            <Route path=":characterKey">
              <Route path="*" index element={<Content tab={tab} />} />
            </Route>
          </Routes>
        </FormulaDataWrapper>
      </GraphContext.Provider>
    </CharacterContext.Provider>
  )
}
